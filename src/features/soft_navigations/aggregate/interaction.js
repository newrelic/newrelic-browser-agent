/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getInfo } from '../../../common/config/info'
import { globalScope, initialLocation } from '../../../common/constants/runtime'
import { generateUuid } from '../../../common/ids/unique-id'
import { addCustomAttributes, getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { cleanURL } from '../../../common/url/clean-url'
import { NODE_TYPE, INTERACTION_STATUS, INTERACTION_TYPE, API_TRIGGER_NAME, IPL_TRIGGER_NAME } from '../constants'
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
  cancellationTimer

  constructor (agentIdentifier, uiEvent, uiEventTimestamp, currentRouteKnown, currentUrl) {
    super(agentIdentifier)
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

  updateDom (timestamp) {
    this.domTimestamp = (timestamp || now()) // default timestamp should be precise for accurate isActiveDuring calculations
  }

  updateHistory (timestamp, newUrl) {
    this.newURL = newUrl || '' + globalScope?.location
    this.historyTimestamp = (timestamp || now())
  }

  seenHistoryAndDomChange () {
    return this.historyTimestamp > 0 && this.domTimestamp > this.historyTimestamp // URL must change before DOM does
  }

  on (event, cb) {
    if (!this.eventSubscription.has(event)) throw new Error('Cannot subscribe to non pre-defined events.')
    if (typeof cb !== 'function') throw new Error('Must supply function as callback.')
    this.eventSubscription.get(event).push(cb)
  }

  done (customEndTime) {
    // User could've mark this interaction--regardless UI or api started--as "don't close until .end() is called on it". Only .end provides a timestamp; the default flows do not.
    if (this.keepOpenUntilEndApi && customEndTime === undefined) return false
    // If interaction is already closed, this is a no-op. However, returning true lets startUIInteraction know that it CAN start a new interaction, as this one is done.
    if (this.status !== INTERACTION_STATUS.IP) return true

    this.onDone.forEach(apiProvidedCb => apiProvidedCb(this.customDataByApi)) // this interaction's .save or .ignore can still be set by these user provided callbacks for example

    if (this.forceIgnore) this.#cancel() // .ignore() always has precedence over save actions
    else if (this.seenHistoryAndDomChange()) this.#finish(customEndTime) // then this should've already finished while it was the interactionInProgress, with a natural end time
    else if (this.forceSave) this.#finish(customEndTime || performance.now()) // a manually saved ixn (did not fulfill conditions) must have a specified end time, if one wasn't provided
    else this.#cancel()
    return true
  }

  #finish (customEndTime = 0) {
    clearTimeout(this.cancellationTimer)
    this.end = Math.max(this.domTimestamp, this.historyTimestamp, customEndTime)
    this.customAttributes = { ...getInfo(this.agentIdentifier).jsAttributes, ...this.customAttributes } // attrs specific to this interaction should have precedence over the general custom attrs
    this.status = INTERACTION_STATUS.FIN

    // Run all the callbacks awaiting this interaction to finish.
    const callbacks = this.eventSubscription.get('finished')
    callbacks.forEach(fn => fn())
  }

  #cancel () {
    clearTimeout(this.cancellationTimer)
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
    return (this.status === INTERACTION_STATUS.FIN && this.start <= timestamp && this.end > timestamp)
  }

  // Following are virtual properties overridden by a subclass:
  get firstPaint () {}
  get firstContentfulPaint () {}
  get navTiming () {}

  serialize (firstStartTimeOfPayload) {
    const isFirstIxnOfPayload = firstStartTimeOfPayload === undefined
    const addString = getAddStringContext(this.agentIdentifier)
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
      numeric(this.callbackEnd), // cbEnd -- relative to start; not used by BrowserInteraction events
      numeric(this.callbackDuration), // not relative
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
    const allAttachedNodes = addCustomAttributes(this.customAttributes || {}, addString) // start with all custom attributes
    if (getInfo(this.agentIdentifier).atts) allAttachedNodes.push('a,' + addString(getInfo(this.agentIdentifier).atts)) // add apm provided attributes
    /* Querypack encoder+decoder quirkiness:
       - If first ixn node of payload is being processed, its children's start time must be offset by this node's start. (firstStartTime should be undefined.)
       - Else for subsequent ixns in the same payload, we go back to using that first ixn node's start to offset their children's start. */
    this.children.forEach(node => allAttachedNodes.push(node.serialize(isFirstIxnOfPayload ? this.start : firstStartTimeOfPayload))) // recursively add the serialized string of every child of this (ixn) bel node

    fields[1] = numeric(allAttachedNodes.length)
    nodeList.push(fields)
    if (allAttachedNodes.length) nodeList.push(allAttachedNodes.join(';'))
    if (this.navTiming) nodeList.push(this.navTiming)
    else nodeList.push('')
    // nodeList = [<fields array>, <serialized string of all attributes and children>, <serialized nav timing info> || '']

    return nodeList.join(';')
  }
}
