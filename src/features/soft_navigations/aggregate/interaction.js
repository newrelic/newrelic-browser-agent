import { getInfo } from '../../../common/config/config'
import { globalScope, initialLocation } from '../../../common/constants/runtime'
import { generateUuid } from '../../../common/ids/unique-id'
import { addCustomAttributes, getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { cleanURL } from '../../../common/url/clean-url'
import { debounce } from '../../../common/util/invoke'
import { NODE_TYPE, INTERACTION_STATUS, INTERACTION_TYPE } from '../constants'
import { BelNode } from './bel-node'

/**
 * link https://github.com/newrelic/nr-querypack/blob/main/schemas/bel/7.qpschema
 **/
export class Interaction extends BelNode {
  id = generateUuid()
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

  constructor (agentIdentifier, uiEventTimestamp) {
    super(agentIdentifier)
    this.belType = NODE_TYPE.INTERACTION
    this.start = uiEventTimestamp
    this.domTimestamp = 0
    this.historyTimestamp = 0
    this.eventSubscription = new Map([
      ['finished', []],
      ['cancelled', []]
    ])

    this.timer = setTimeout(() => {
      // make this interaction invalid after 30 seconds if it's not completed
      this.cancel()
    }, 30000)
  }

  updateDom (timestamp) {
    this.domTimestamp = (timestamp || now())
    this.checkIfFinished()
  }

  updateHistory (timestamp, newUrl) {
    this.newURL = newUrl || '' + globalScope?.location
    this.historyTimestamp = (timestamp || now())
    this.checkIfFinished()
  }

  checkIfFinished = debounce(() => {
    if (this.domTimestamp > 0 && this.historyTimestamp > 0) this.finish()
  }, 60)

  finish () {
    clearTimeout(this.timer)
    this.end = Math.max(this.domTimestamp, this.historyTimestamp) - this.start
    this.customAttributes = { ...getInfo(this.agentIdentifier).jsAttributes, ...this.customAttributes } // attrs specific to this interaction should have precedence over the general custom attrs
    this.status = INTERACTION_STATUS.FIN

    // Run all the callbacks awaiting this interaction to finish.
    const callbacks = this.eventSubscription.get('finished')
    callbacks.forEach(fn => fn())
  }

  cancel () {
    clearTimeout(this.timer)
    this.status = INTERACTION_STATUS.CAN

    // Run all the callbacks listening to this interaction's potential cancellation.
    const callbacks = this.eventSubscription.get('cancelled')
    callbacks.forEach(fn => fn())
  }

  // Following are virtual properties overridden by a subclass:
  get firstPaint () {}
  get firstContentfulPaint () {}
  get navTiming () {}

  serialize () {
    const addString = getAddStringContext(this.agentIdentifier)
    const nodeList = []
    let ixnType
    if (this.trigger === 'initialPageLoad') ixnType = INTERACTION_TYPE.INITIAL_PAGE_LOAD
    else if (this.newURL !== this.oldURL) ixnType = INTERACTION_TYPE.ROUTE_CHANGE
    else ixnType = INTERACTION_TYPE.UNSPECIFIED

    const allAttachedNodes = addCustomAttributes(this.customAttributes || {}, addString) // start with all custom attributes
    if (getInfo(this.agentIdentifier).atts) allAttachedNodes.push('a,' + addString(getInfo(this.agentIdentifier).atts)) // add apm provided attributes
    this.children.forEach(node => allAttachedNodes.push(node.serialize())) // recursively add the serialized string of every child of this (ixn) bel node

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
