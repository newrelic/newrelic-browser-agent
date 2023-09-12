// import { getInfo } from '../../../common/config/config'
import { globalScope, initialLocation } from '../../../common/constants/runtime'
// import { generateUuid } from '../../../common/ids/unique-id'
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
  #trigger
  #initialPageURL = initialLocation
  #oldURL = '' + globalScope?.location
  #newURL = '' + globalScope?.location
  #customName
  #category
  #queueTime
  #appTime
  #oldRoute
  #newRoute
  #previousRouteName
  #targetRouteName

  #subscribers = new Map()
  #emitted = false

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

  get trigger () { return getAddStringContext(this.agentIdentifier)(this.#trigger) }
  set trigger (v) { this.#trigger = v; console.log('SET TRIGGER TO', v) }

  get initialPageURL () { return getAddStringContext(this.agentIdentifier)(cleanURL(this.#initialPageURL, true)) }
  set initialPageURL (v) { this.#initialPageURL = v }

  get oldURL () { return getAddStringContext(this.agentIdentifier)(cleanURL(this.#oldURL, true)) }
  set oldURL (v) { this.#oldURL = v }

  get newURL () { return getAddStringContext(this.agentIdentifier)(cleanURL(this.#newURL, true)) }
  set newURL (v) { this.#newURL = v }

  get customName () { return getAddStringContext(this.agentIdentifier)(this.#customName) }
  set customName (v) { this.#customName = v }

  get category () { return this.#category }
  set category (v) { this.#category = v }

  get queueTime () { return nullable(this.#queueTime, numeric, true) }
  set queueTime (v) { this.#queueTime = v }

  get appTime () { return nullable(this.#appTime, numeric, true) }
  set appTime (v) { this.#appTime = v }

  get oldRoute () { return nullable(this.#oldRoute, getAddStringContext(this.agentIdentifier), true) }
  set oldRoute (v) { this.#oldRoute = v }

  get newRoute () { return nullable(this.#newRoute, getAddStringContext(this.agentIdentifier), true) }
  set newRoute (v) { this.#newRoute = v }

  get previousRouteName () { return getAddStringContext(this.agentIdentifier)(this.#previousRouteName) }

  get targetRouteName () { return getAddStringContext(this.agentIdentifier)(this.#targetRouteName) }

  get childCount () { return numeric(this.children.length) }

  on (event, cb) {
    if (typeof cb !== 'function') throw new Error('Must supply function as callback')
    const cbs = this.#subscribers.get(event) || []
    cbs.push(cb)
    this.#subscribers.set(event, cbs)
  }

  finish (end) {
    if (this.#emitted) return
    clearTimeout(this.timer)
    this.end = (end || Math.max(this.domTimestamp, this.historyTimestamp, this.tti)) - this.startRaw
    this.callbackDuration = this.#trigger === 'initialPageLoad' ? 0 : this.tti - Math.max(this.domTimestamp, this.historyTimestamp)
    for (let [evt, cbs] of this.#subscribers) {
      if (evt === 'finished') cbs.forEach(cb => cb(this))
    }
  }

  cancel () {
    if (this.#emitted) return
    clearTimeout(this.timer)
    for (let [evt, cbs] of this.#subscribers) {
      if (evt === 'cancelled') cbs.forEach(cb => cb(this))
    }
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
    // const customAttrs = addCustomAttributes(getInfo(this.agentIdentifier).jsAttributes || {}, getAddStringContext(this.agentIdentifier), true)
    const customAttrs = []
    const metadataAttrs = this.domTimestamp && this.historyTimestamp
      ? addCustomAttributes({
        domTimestamp: this.domTimestamp,
        historyTimestamp: this.historyTimestamp
      }, getAddStringContext(this.agentIdentifier), true)
      : []
    const childrenAndAttrs = metadataAttrs.concat(customAttrs).concat(this.children)
    const nodeList = []
    const fields = [
      this.belType,
      // this.childCount,
      childrenAndAttrs.length,
      this.start,
      this.end,
      // this.calculatedEnd,
      // this.callbackEnd,
      this.end,
      // this.calculatedEnd,
      // this.calculatedCallbackEnd,
      this.callbackDuration,
      this.trigger,
      this.initialPageURL,
      this.oldURL,
      this.newURL,
      this.customName,
      this.category,
      this.queueTime + this.appTime + this.oldRoute + this.newRoute + this.id,
      this.nodeId
    ]

    nodeList.push(fields)

    childrenAndAttrs.forEach(node => nodeList.push(node.serialize()))

    return nodeList.join(';')
  }
}
