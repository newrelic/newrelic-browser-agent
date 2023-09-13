import { now } from '../../../common/timing/now'

let nodesSeen = 0

export class BelNode {
  subscribers = new Map()
  emitted = false

  belType
  children = []
  start = now()
  end
  callbackEnd = 0
  callbackDuration = 0
  nodeId = String(++nodesSeen)

  constructor (agentIdentifier) {
    this.agentIdentifier = agentIdentifier
  }

  containsEvent (timestamp) {
    if (!this.end) return this.start <= timestamp
    return (this.start <= timestamp && this.end >= timestamp)
  }

  addChild (child) {
    this.children.push(child)
  }

  on (event, cb) {
    if (typeof cb !== 'function') throw new Error('Must supply function as callback')
    const cbs = this.subscribers.get(event) || []
    cbs.push(cb)
    this.subscribers.set(event, cbs)
  }

  cancel () {
    this.cancelled = true
    if (this.emitted) return
    clearTimeout(this.timer)
    if (this.children) this.children.forEach(child => child?.cancel())
    for (let [evt, cbs] of this.subscribers) {
      if (evt === 'cancelled') cbs.forEach(cb => cb(this))
    }
  }

  validateChildren () {
    this.children.forEach(child => {
      if (child.start < this.start || child.end > this.end) {
        child?.cancel()
      } else child?.validateChildren()
    })
    this.children = this.children.filter(c => !c.cancelled)
  }
}
