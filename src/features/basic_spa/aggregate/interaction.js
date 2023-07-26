import { globalScope, initialLocation } from '../../../common/constants/runtime'
import { generateUuid } from '../../../common/ids/unique-id'
import { getAddStringContext, nullable, numeric } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { cleanURL } from '../../../common/url/clean-url'
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

  constructor (agentIdentifier) {
    this.agentIdentifier = agentIdentifier
    this.initialPageURL = initialLocation
    this.oldURL = '' + globalScope?.location
  }

  get belType () { return numeric(this.#belType) }

  get trigger () { return getAddStringContext(this.agentIdentifier)(this.#trigger) }
  set trigger (v) { this.#trigger = v }

  get start () { return numeric(this.#start) }
  set start (v) { this.#start = v }

  get end () { return numeric(this.#end) }
  set end (v) { this.#end = v }

  get callbackEnd () { return numeric(this.#callbackEnd) }

  get callbackDuration () { return numeric(this.#callbackDuration) }

  get nodeId () { return getAddStringContext(this.agentIdentifier)(this.#nodeId) }

  get initialPageURL () { getAddStringContext(this.agentIdentifier)(cleanURL(this.#initialPageURL)) }
  set initialPageURL (v) { this.#initialPageURL = v }

  get oldURL () { return getAddStringContext(this.agentIdentifier)(cleanURL(this.#oldURL)) }
  set oldURL (v) { this.#oldURL = v }

  get newURL () { return getAddStringContext(this.agentIdentifier)(cleanURL(this.#newURL)) }
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

  finish (url) {
    if (!url) throw new Error('Cannot finish ixn without a url')
    this.newURL = url
    this.end = now()
  }

  containsEvent (timestamp) {
    if (!this.#end) return this.#start <= timestamp
    return (this.#start <= timestamp && this.#end >= timestamp)
  }

  serialize (type) {
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
    if (type === 'bel') return this.serialize().join(';')
    if (!type) return nodeList
  }
}
