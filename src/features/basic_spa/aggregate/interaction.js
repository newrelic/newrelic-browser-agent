import { globalScope, initialLocation } from '../../../common/constants/runtime'
import { generateUuid } from '../../../common/ids/unique-id'
import { getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { cleanURL } from '../../../common/url/clean-url'
import { debounce } from '../../../common/util/invoke'
import { TYPE_IDS } from '../constants'

let nodesSeen = 0

/**
 * link https://github.com/newrelic/nr-querypack/blob/main/schemas/bel/7.qpschema
 **/
export class Interaction {
  #id = generateUuid()
  #belType = TYPE_IDS.INTERACTION
  #children = []
  #start = now()
  #end
  #callbackEnd = 0
  #callbackDuration = 0
  #nodeId = String(++nodesSeen)
  #childCount = 0

  #trigger
  #initialPageURL
  #oldURL
  #newURL
  #customName
  #category
  #queueTime
  #appTime
  #oldRoute
  #newRoute
  #previousRouteName
  #targetRouteName

  constructor (agentIdentifier, { onFinished }) {
    if (!agentIdentifier || !onFinished) throw new Error('Interaction is missing core attributes')
    this.agentIdentifier = agentIdentifier
    this.initialPageURL = initialLocation
    this.oldURL = '' + globalScope?.location

    this.domTimestamp = undefined
    this.historyTimestamp = undefined

    this.onFinished = onFinished

    setTimeout(() => {
      // make this interaction invalid as to not hold up any other events
      if (!this.#end) this.#end = -1
    }, 60000)
  }

  get belType () { return numeric(this.#belType) }

  get trigger () { return getAddStringContext(this.agentIdentifier)(this.#trigger) }
  set trigger (v) { this.#trigger = v }

  get start () { return numeric(this.#start) }
  set start (v) { this.#start = v }

  get end () { return numeric(this.#end) }
  set end (v) { this.#end = v }

  get callbackEnd () { return numeric(this.#callbackEnd) } // do we calculate this still?
  set callbackEnd (v) { this.#callbackEnd = v }

  get callbackDuration () { return numeric(this.#callbackDuration) }
  set callbackDuration (v) { this.#callbackDuration = v }

  get nodeId () { return getAddStringContext(this.agentIdentifier)(this.#nodeId) }

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

  get id () { return getAddStringContext(this.agentIdentifier)(this.#id) }

  get previousRouteName () { return getAddStringContext(this.agentIdentifier)(this.#previousRouteName) }

  get targetRouteName () { return getAddStringContext(this.agentIdentifier)(this.#targetRouteName) }

  get childCount () { return numeric(this.#childCount) }
  set childCount (v) { this.#childCount = v }

  countChild () { this.childCount = this.childCount + 1 }

  finish (end) {
    // console.log('end before', this.#end)
    this.end = end || Math.max(this.domTimestamp, this.historyTimestamp)
    // console.log('end after', this.#end)
    this.onFinished()
  }

  containsEvent (timestamp) {
    if (!this.#end) return this.#start <= timestamp
    return (this.#start <= timestamp && this.#end >= timestamp)
  }

  updateDom (timestamp) {
    this.domTimestamp = timestamp || now()
    this.checkFinished()
  }

  updateHistory (timestamp, url) {
    this.newURL = url || '' + globalScope?.location
    this.historyTimestamp = timestamp || now()
    this.checkFinished()
  }

  checkFinished = debounce(() => {
    // console.log(performance.now(), 'checking finish for', this, !!this.domTimestamp && !!this.historyTimestamp)
    if (!!this.domTimestamp && !!this.historyTimestamp) this.finish()
  }, 60)

  serialize () {
    const nodeList = []
    const fields = [
      this.belType,
      this.childCount,
      this.start,
      this.end,
      this.callbackEnd,
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

    return nodeList.join(';')
  }
}
