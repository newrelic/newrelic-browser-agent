import { getInfo } from '../../../common/config/config'
import { globalScope, initialLocation } from '../../../common/constants/runtime'
import { generateUuid } from '../../../common/ids/unique-id'
import { addCustomAttributes, getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { cleanURL } from '../../../common/url/clean-url'
import { NODE_TYPE, INTERACTION_STATUS, INTERACTION_TYPE } from '../constants'
import { BelNode } from './bel-node'

/**
 * link https://github.com/newrelic/nr-querypack/blob/main/schemas/bel/7.qpschema
 **/
export class Interaction extends BelNode {
  id = generateUuid() // unique id that is serialized and used to link interactions with errors
  trigger
  initialPageURL = initialLocation
  oldURL = '' + globalScope?.location
  newURL = '' + globalScope?.location
  customName
  customAttributes = {}
  queueTime // only used by initialPageLoad interactions
  appTime // only used by initialPageLoad interactions
  oldRoute
  newRoute
  previousRouteName
  targetRouteName
  /** Internal state of this interaction: in-progress, finished, or cancelled. */
  status = INTERACTION_STATUS.IP
  domTimestamp = 0
  historyTimestamp = 0

  constructor (agentIdentifier, uiEvent, uiEventTimestamp) {
    super(agentIdentifier)
    this.belType = NODE_TYPE.INTERACTION
    this.trigger = uiEvent
    this.start = uiEventTimestamp
    this.eventSubscription = new Map([
      ['finished', []],
      ['cancelled', []]
    ])

    this.timer = setTimeout(() => this.cancel(), 30000) // in-progress interactions are disregarded after 30 seconds if it's not completed by then (or cancelled elsewhere)
  }

  updateDom (timestamp) {
    this.domTimestamp = (timestamp || now())
  }

  updateHistory (timestamp, newUrl) {
    this.newURL = newUrl || '' + globalScope?.location
    this.historyTimestamp = (timestamp || now())
  }

  seenHistoryAndDomChange () {
    return this.domTimestamp > 0 && this.historyTimestamp > 0
  }

  on (event, cb) {
    if (!this.eventSubscription.has(event)) throw new Error('Cannot subscribe to non pre-defined events.')
    if (typeof cb !== 'function') throw new Error('Must supply function as callback.')
    this.subscribers.get(event).push(cb)
  }

  finish () {
    if (this.status !== INTERACTION_STATUS.IP) return // disallow this call if the ixn is already done aka not in-progress
    clearTimeout(this.timer)
    this.end = Math.max(this.domTimestamp, this.historyTimestamp) - this.start
    this.customAttributes = { ...getInfo(this.agentIdentifier).jsAttributes, ...this.customAttributes } // attrs specific to this interaction should have precedence over the general custom attrs
    this.status = INTERACTION_STATUS.FIN

    // Run all the callbacks awaiting this interaction to finish.
    const callbacks = this.eventSubscription.get('finished')
    callbacks.forEach(fn => fn())
  }

  cancel () {
    if (this.status !== INTERACTION_STATUS.IP) return // disallow this call if the ixn is already done aka not in-progress
    clearTimeout(this.timer)
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
    return (this.status === INTERACTION_STATUS.FIN && this.start <= timestamp && this.end >= timestamp)
  }

  // Following are virtual properties overridden by a subclass:
  get firstPaint () {}
  get firstContentfulPaint () {}
  get navTiming () {}

  serialize () {
    // Nested interaction nodes are not supported, so the passing of arguments, e.g. timestamp of parent node, doesn't make sense and is indicative of a problem.
    if (arguments.length > 0) throw new Error('Interaction serialization should not have any arguments passed in!')

    const addString = getAddStringContext(this.agentIdentifier)
    const nodeList = []
    let ixnType
    if (this.trigger === 'initialPageLoad') ixnType = INTERACTION_TYPE.INITIAL_PAGE_LOAD
    else if (this.newURL !== this.oldURL) ixnType = INTERACTION_TYPE.ROUTE_CHANGE
    else ixnType = INTERACTION_TYPE.UNSPECIFIED

    const allAttachedNodes = addCustomAttributes(this.customAttributes || {}, addString) // start with all custom attributes
    if (getInfo(this.agentIdentifier).atts) allAttachedNodes.push('a,' + addString(getInfo(this.agentIdentifier).atts)) // add apm provided attributes
    this.children.forEach(node => allAttachedNodes.push(node.serialize(this.start))) // recursively add the serialized string of every child of this (ixn) bel node

    const fields = [
      numeric(this.belType),
      allAttachedNodes.length,
      numeric(this.start), // relative to first node (this in interaction)
      numeric(this.end), // end -- relative to start
      numeric(this.callbackEnd), // cbEnd -- relative to start
      numeric(this.callbackDuration), // not relative
      addString(this.trigger),
      addString(cleanURL(this.initialPageURL, true)),
      addString(cleanURL(this.oldURL, true)),
      addString(cleanURL(this.newURL, true)),
      addString(this.customName),
      ixnType,
      nullable(this.queueTime, numeric),
      nullable(this.appTime, numeric),
      nullable(this.oldRoute, addString),
      nullable(this.newRoute, addString),
      addString(this.id),
      addString(this.nodeId),
      nullable(this.firstPaint, numeric),
      nullable(this.firstContentfulPaint, numeric)
    ]

    nodeList.push(fields)
    if (allAttachedNodes.length) nodeList.push(allAttachedNodes.join(';'))
    if (this.navTiming) nodeList.push(this.navTiming)
    else nodeList.push('')
    // nodeList = [<fields array>, <serialized string of all attributes and children>, <serialized nav timing info> || '']

    return nodeList.join(';')
  }
}
