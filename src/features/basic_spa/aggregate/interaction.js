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
  _id = generateUuid()
  _belType = TYPE_IDS.INTERACTION
  _children = []
  _start = now()
  _end
  _callbackEnd = 0
  _callbackDuration = 0
  _nodeId = String(++nodesSeen)

  _trigger
  _initialPageURL
  _oldURL
  _newURL
  _customName
  _category
  _queueTime
  _appTime
  _oldRoute
  _newRoute
  _previousRouteName
  _targetRouteName
  _childCount

  constructor (agentIdentifier) {
    this.agentIdentifier = agentIdentifier
    this.initialPageURL = initialLocation
    this.oldURL = '' + globalScope?.location
    this.childCount = 0
  }

  get belType () { return numeric(this._belType) }

  get trigger () { return getAddStringContext(this.agentIdentifier)(this._trigger) }
  set trigger (v) { this._trigger = v }

  get start () { return numeric(this._start) }
  set start (v) { this._start = v }

  get end () { return numeric(this._end) }
  set end (v) { this._end = v }

  get callbackEnd () { return numeric(this._callbackEnd) }

  get callbackDuration () { return numeric(this._callbackDuration) }

  get nodeId () { return getAddStringContext(this.agentIdentifier)(this._nodeId) }

  get initialPageURL () { getAddStringContext(this.agentIdentifier)(cleanURL(this._initialPageURL)) }
  set initialPageURL (v) { this._initialPageURL = v }

  get oldURL () { return getAddStringContext(this.agentIdentifier)(cleanURL(this._oldURL)) }
  set oldURL (v) { this._oldURL = v }

  get newURL () { return getAddStringContext(this.agentIdentifier)(cleanURL(this._newURL)) }
  set newURL (v) { this._newURL = v }

  get customName () { return getAddStringContext(this.agentIdentifier)(this._customName) }
  set customName (v) { this._customName = v }

  get category () { return this._category }
  set category (v) { this._category = v }

  get queueTime () { return nullable(this._queueTime, numeric, true) }
  set queueTime (v) { this._queueTime = v }

  get appTime () { return nullable(this._appTime, numeric, true) }
  set appTime (v) { this._appTime = v }

  get oldRoute () { return nullable(this._oldRoute, getAddStringContext(this.agentIdentifier), true) }
  set oldRoute (v) { this._oldRoute = v }

  get newRoute () { return nullable(this._newRoute, getAddStringContext(this.agentIdentifier), true) }
  set newRoute (v) { this._newRoute = v }

  get id () { return getAddStringContext(this.agentIdentifier)(this._id) }

  get previousRouteName () { return getAddStringContext(this.agentIdentifier)(this._previousRouteName) }

  get targetRouteName () { return getAddStringContext(this.agentIdentifier)(this._targetRouteName) }

  get childCount () { return numeric(this._childCount) }
  set childCount (v) { this._childCount = v }

  countChild () { this.childCount = this.childCount + 1 }

  finish (url) {
    if (!url) throw new Error('Cannot finish ixn without a url')
    this.newURL = url
    this.end = now()
  }

  get isFinished () { return this.start >= 0 && (this.end ?? -1) >= this.start }

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
    return nodeList
  }

  transform (type) {
    if (type === 'bel') return `bel.7;${this.serialize().join(';')}`
  }
}
