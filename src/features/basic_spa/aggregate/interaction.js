import { getInfo } from '../../../common/config/config'
import { globalScope, initialLocation } from '../../../common/constants/runtime'
import { generateUuid } from '../../../common/ids/unique-id'
import { addCustomAttributes, getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { TimeToInteractive } from '../../../common/timing/time-to-interactive'
import { cleanURL } from '../../../common/url/clean-url'
import { debounce } from '../../../common/util/invoke'
import { TYPE_IDS } from '../constants'
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
  category
  queueTime
  appTime
  oldRoute
  newRoute
  previousRouteName
  targetRouteName

  constructor (agentIdentifier) {
    super(agentIdentifier)
    if (!agentIdentifier) throw new Error('Interaction is missing core attributes')
    this.initialPageURL = initialLocation
    this.oldURL = '' + globalScope?.location
    this.belType = TYPE_IDS.INTERACTION

    this.domTimestamp = 0
    this.historyTimestamp = 0

    this.timer = setTimeout(() => {
      // make this interaction invalid as to not hold up any other events
      this.cancel()
    }, 30000)

    new TimeToInteractive({
      startTimestamp: now()
    }).then(({ value }) => {
      this.tti = value
      this.checkFinished()
    })
  }

  finish (end) {
    if (this.emitted) return
    clearTimeout(this.timer)
    this.end = (end || Math.max(this.domTimestamp, this.historyTimestamp, this.tti)) - this.start
    this.callbackDuration = this.trigger === 'initialPageLoad' ? 0 : (this.tti - Math.max(this.domTimestamp, this.historyTimestamp))
    this.callbackEnd = this.end - this.callbackDuration
    for (let [evt, cbs] of this.subscribers) {
      if (evt === 'finished') cbs.forEach(cb => cb(this))
    }
    console.log('finished...', performance.now(), this)
  }

  updateDom (timestamp) {
    this.domTimestamp = (timestamp || now())
    this.checkFinished()
  }

  updateHistory (timestamp, url) {
    this.newURL = url || '' + globalScope?.location
    this.historyTimestamp = (timestamp || now())
    this.checkFinished()
  }

  checkFinished = debounce(() => {
    // console.log(performance.now(), 'checking finish for', this.#id, !!this.domTimestamp, !!this.historyTimestamp)
    if (!!this.domTimestamp && !!this.historyTimestamp && !!this.tti) this.finish()
  }, 60)

  serialize () {
    const addString = getAddStringContext(this.agentIdentifier)
    const nodeList = []
    const fields = [
      numeric(this.belType),
      this.children.length,
      numeric(this.start), // relative to first node (this in interaction)
      numeric(this.end), // end -- relative to start
      numeric(this.callbackEnd), // cbEnd -- relative to start
      numeric(this.callbackDuration), // not relative
      addString(this.trigger),
      addString(cleanURL(this.initialPageURL, true)),
      addString(cleanURL(this.oldURL, true)),
      addString(cleanURL(this.newURL, true)),
      addString(this.customName),
      this.category,
      nullable(this.queueTime, numeric, true) +
      nullable(this.appTime, numeric, true) +
      nullable(this.oldRoute, addString, true) +
      nullable(this.newRoute, addString, true) +
      addString(this.id),
      addString(this.nodeId)
    ]

    const customAttrs = addCustomAttributes(getInfo(this.agentIdentifier).jsAttributes || {}, addString, true)
    // const customAttrs = []
    const metadataAttrs = this.domTimestamp && this.historyTimestamp
      ? addCustomAttributes({
        domTimestamp: this.domTimestamp,
        historyTimestamp: this.historyTimestamp
      }, addString, true)
      : []

    this.validateChildren()

    const childrenAndAttrs = metadataAttrs.concat(customAttrs).concat(this.children)
    fields[1] = childrenAndAttrs.length
    nodeList.push(fields)

    childrenAndAttrs.forEach(node => nodeList.push(node.serialize(this.start)))

    return nodeList.join(';')
  }
}
