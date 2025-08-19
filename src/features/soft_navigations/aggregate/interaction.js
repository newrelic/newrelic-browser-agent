/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope, initialLocation } from '../../../common/constants/runtime'
import { generateUuid } from '../../../common/ids/unique-id'
import { addCustomAttributes, getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { cleanURL } from '../../../common/url/clean-url'
import { NODE_TYPE, INTERACTION_STATUS, INTERACTION_TYPE, API_TRIGGER_NAME, IPL_TRIGGER_NAME, NO_LONG_TASK_WINDOW } from '../constants'
import { BelNode } from './bel-node'

/**
 * link https://github.com/newrelic/nr-querypack/blob/main/schemas/bel/7.qpschema
 **/
export class Interaction extends BelNode {
  id = generateUuid() // unique id that is serialized and used to link interactions with errors
  initialPageURL = initialLocation
  customName
  customAttributes = {}
  customDataByApi = {}
  queueTime // only used by initialPageLoad interactions
  appTime // only used by initialPageLoad interactions
  newRoute
  /** Internal state of this interaction: in-progress, finished, or cancelled. */
  status = INTERACTION_STATUS.IP
  domTimestamp = 0
  historyTimestamp = 0
  createdByApi = false
  keepOpenUntilEndApi = false
  onDone = []
  customEnd = 0
  cancellationTimer
  watchLongtaskTimer

  constructor (uiEvent, uiEventTimestamp, currentRouteKnown, currentUrl) {
    super()
    this.belType = NODE_TYPE.INTERACTION
    this.trigger = uiEvent
    this.start = uiEventTimestamp
    this.oldRoute = currentRouteKnown
    this.eventSubscription = new Map([
      ['finished', []],
      ['cancelled', []]
    ])
    this.forceSave = this.forceIgnore = false
    if (this.trigger === API_TRIGGER_NAME) this.createdByApi = true
    this.newURL = this.oldURL = (currentUrl || globalScope?.location.href)
  }

  updateHistory (timestamp, newUrl) {
    if (this.domTimestamp > 0) return // url is locked once ui>url>dom change sequence is seen
    if (!newUrl || newUrl === this.oldURL) return // url must be different for interaction heuristic to proceed
    this.newURL = newUrl || globalScope?.location.href
    this.historyTimestamp = (timestamp || now())
  }

  updateDom (timestamp) {
    if (!this.historyTimestamp || timestamp < this.historyTimestamp) return // dom change must come after (any) url change, though this can be updated multiple times, taking the last dom timestamp
    this.domTimestamp = (timestamp || now()) // default timestamp should be precise for accurate isActiveDuring calculations
  }

  checkHistoryAndDomChange () {
    if (!(this.historyTimestamp > 0 && this.domTimestamp > this.historyTimestamp)) return false
    if (this.status === INTERACTION_STATUS.PF) return true // indicate the finishing process has already started for this interaction
    this.status = INTERACTION_STATUS.PF // set for eventual harvest

    // Once the fixed reqs for a nav has been met, start a X countdown timer that watches for any long task, if it doesn't already exist, before completing the interaction.
    clearTimeout(this.cancellationTimer) // "pending-finish" ixns cannot be auto cancelled anymore
    this.watchLongtaskTimer ??= setTimeout(() => this.done(), NO_LONG_TASK_WINDOW)
    // Notice that by not providing a specific end time to `.done()`, the ixn will use the dom timestamp in the event of no long task, which is what we want.
    return true
  }

  on (event, cb) {
    if (!this.eventSubscription.has(event)) throw new Error('Cannot subscribe to non pre-defined events.')
    if (typeof cb !== 'function') throw new Error('Must supply function as callback.')
    this.eventSubscription.get(event).push(cb)
  }

  done (customEndTime = this.customEnd, calledByApi = false) {
    // User could've mark this interaction--regardless UI or api started--as "don't close until .end() is called on it".
    if (this.keepOpenUntilEndApi && !calledByApi) return false
    // If interaction is already closed, this is a no-op. However, returning true lets startUIInteraction know that it CAN start a new interaction, as this one is done.
    if (this.status === INTERACTION_STATUS.FIN || this.status === INTERACTION_STATUS.CAN) return true

    clearTimeout(this.cancellationTimer) // clean up timers in case this is called by any flow that doesn't already do so
    clearTimeout(this.watchLongtaskTimer)
    this.onDone.forEach(apiProvidedCb => apiProvidedCb(this.customDataByApi)) // this interaction's .save or .ignore can still be set by these user provided callbacks for example

    if (this.forceIgnore) this.#cancel() // .ignore() always has precedence over save actions
    else if (this.status === INTERACTION_STATUS.PF) this.#finish(customEndTime) // then this should've already finished while it was the interactionInProgress, with a natural end time
    else if (this.forceSave) this.#finish(customEndTime || performance.now()) // a manually saved ixn (did not fulfill conditions) must have a specified end time, if one wasn't provided
    else this.#cancel()
    return true
  }

  #finish (customEndTime) {
    this.end = Math.max(this.domTimestamp, this.historyTimestamp, customEndTime)
    this.status = INTERACTION_STATUS.FIN

    // Run all the callbacks awaiting this interaction to finish.
    const callbacks = this.eventSubscription.get('finished')
    callbacks.forEach(fn => fn())
  }

  #cancel () {
    this.status = INTERACTION_STATUS.CAN

    // Run all the callbacks listening to this interaction's potential cancellation.
    const callbacks = this.eventSubscription.get('cancelled')
    callbacks.forEach(fn => fn())
  }

  /**
   * Given a timestamp, determine if it falls within this interaction's span, i.e. if this was the active interaction during that time.
   * For in-progress interactions, this only compares the time with the start of span. Cancelled interactions are not considered active at all.
   * @param {DOMHighResTimeStamp} timestamp
   * @returns True or false boolean.
   */
  isActiveDuring (timestamp) {
    if (this.status === INTERACTION_STATUS.IP) return this.start <= timestamp
    if (this.status === INTERACTION_STATUS.PF) return this.start <= timestamp && timestamp < this.domTimestamp // for now, ajax & jserror that occurs during long task & pending-finish ixn await periods will not be tied to the ixn
    return (this.status === INTERACTION_STATUS.FIN && this.start <= timestamp && timestamp < this.end)
  }

  // Following are virtual properties overridden by a subclass:
  get firstPaint () {}
  get firstContentfulPaint () {}
  get navTiming () {}

  /**
   * Serializes (BEL) the interaction data for transmission.
   * @param {Number} firstStartTimeOfPayload timestamp
   * @param {Agent} agentRef Pass in the agent reference directly so that the event itself doesnt need to store the pointers and ruin the evaluation of the event size by including unused object references.
   * @returns {String} A string that is the serialized representation of this interaction.
   */
  serialize (firstStartTimeOfPayload, agentRef) {
    const isFirstIxnOfPayload = firstStartTimeOfPayload === undefined
    const addString = getAddStringContext(agentRef.runtime.obfuscator)
    const nodeList = []
    let ixnType
    if (this.trigger === IPL_TRIGGER_NAME) ixnType = INTERACTION_TYPE.INITIAL_PAGE_LOAD
    else if (this.newURL !== this.oldURL) ixnType = INTERACTION_TYPE.ROUTE_CHANGE
    else ixnType = INTERACTION_TYPE.UNSPECIFIED

    // IMPORTANT: The order in which addString is called matters and correlates to the order in which string shows up in the harvest payload. Do not re-order the following code.
    const fields = [
      numeric(this.belType),
      0, // this will be overwritten below with number of attached nodes
      numeric(this.start - (isFirstIxnOfPayload ? 0 : firstStartTimeOfPayload)), // the very 1st ixn does not require offset so it should fallback to a 0 while rest is offset by the very 1st ixn's start
      numeric(this.end - this.start), // end -- relative to start
      numeric(0), // callbackEnd -- relative to start; not used by BrowserInteraction events so these are always 0
      numeric(0), // not relative; always 0 for BrowserInteraction
      addString(this.trigger),
      addString(cleanURL(this.initialPageURL, true)),
      addString(cleanURL(this.oldURL, true)),
      addString(cleanURL(this.newURL, true)),
      addString(this.customName),
      ixnType,
      nullable(this.queueTime, numeric, true) + nullable(this.appTime, numeric, true) +
      nullable(this.oldRoute, addString, true) + nullable(this.newRoute, addString, true) +
      addString(this.id),
      addString(this.nodeId),
      nullable(this.firstPaint, numeric, true) + nullable(this.firstContentfulPaint, numeric)
    ]
    const customAttributes = { ...agentRef.info.jsAttributes, ...this.customAttributes } // attrs specific to this interaction should have precedence over the general custom attrs
    const allAttachedNodes = addCustomAttributes(customAttributes || {}, addString) // start with all custom attributes
    if (agentRef.info.atts) allAttachedNodes.push('a,' + addString(agentRef.info.atts)) // add apm provided attributes
    /* Querypack encoder+decoder quirkiness:
       - If first ixn node of payload is being processed, its children's start time must be offset by this node's start. (firstStartTime should be undefined.)
       - Else for subsequent ixns in the same payload, we go back to using that first ixn node's start to offset their children's start. */
    this.children.forEach(node => allAttachedNodes.push(node.serialize(isFirstIxnOfPayload ? this.start : firstStartTimeOfPayload, agentRef))) // recursively add the serialized string of every child of this (ixn) bel node

    fields[1] = numeric(allAttachedNodes.length)
    nodeList.push(fields)
    if (allAttachedNodes.length) nodeList.push(allAttachedNodes.join(';'))
    if (this.navTiming) nodeList.push(this.navTiming)
    else nodeList.push('')
    // nodeList = [<fields array>, <serialized string of all attributes and children>, <serialized nav timing info> || '']

    return nodeList.join(';')
  }
}
