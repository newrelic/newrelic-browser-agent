import { generateUuid } from '../../../common/ids/unique-id'
import { getAddStringContext, numeric } from '../../../common/serialize/bel-serializer'
import { now } from '../../../common/timing/now'
import { TYPE_IDS } from '../constants'

let nodesSeen = 0

export class BelNode {
  #id = generateUuid()
  #belType
  #children = []
  #start = now()
  #end
  #callbackEnd = 0
  #callbackDuration = 0
  #nodeId = String(++nodesSeen)

  constructor (agentIdentifier) {
    this.agentIdentifier = agentIdentifier
  }

  get belType () { return numeric(this.#belType) }
  set belType (v) { this.#belType = v }

  get start () { return numeric(this.#start) }
  set start (v) { this.#start = v }

  get startRaw () { return this.#start }

  get end () { return numeric(this.#end) }
  set end (v) { this.#end = v }

  get callbackEnd () { return numeric(this.#callbackEnd) } // do we calculate this still?
  set callbackEnd (v) { this.#callbackEnd = v }

  get callbackDuration () { return this.belType === TYPE_IDS.AJAX ? numeric(this.calculatedEnd) : numeric(this.#callbackDuration) }
  // set callbackDuration (v) { this.#callbackDuration = v }

  get nodeId () { return getAddStringContext(this.agentIdentifier)(this.#nodeId) }

  get id () { return getAddStringContext(this.agentIdentifier)(this.#id) }

  get children () { return this.#children }

  get calculatedEnd () { return this.#end - this.#start }
  get calculatedCallbackEnd () { return this.calculatedEnd }

  containsEvent (timestamp) {
    if (!this.#end) return this.#start <= timestamp
    return (this.#start <= timestamp && this.#end >= timestamp)
  }

  addChild (child) {
    this.children.push(child)
  }
}
