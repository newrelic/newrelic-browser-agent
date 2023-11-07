import { now } from '../../../common/timing/now'

let nodesSeen = 0

export class BelNode {
  belType
  /** List of other BelNode derivatives. Each children should be of a subclass that implements its own 'serialize' function. */
  children = []
  start = now()
  end
  callbackEnd = 0
  callbackDuration = 0
  nodeId = String(++nodesSeen)

  constructor (agentIdentifier) {
    if (!agentIdentifier) throw new Error('Interaction is missing core attributes')
    this.agentIdentifier = agentIdentifier
  }

  containsEvent (timestamp) {
    if (!this.end) return this.start <= timestamp
    return (this.start <= timestamp && this.end >= timestamp)
  }

  addChild (child) {
    this.children.push(child)
  }

  /** Virtual fn for stringifying an instance. */
  serialize () {}

  // validateChildren () {
  //   this.children.forEach(child => {
  //     if (child.start < this.start || child.end > this.end) {
  //       child?.cancel()
  //     } else child?.validateChildren()
  //   })
  //   this.children = this.children.filter(c => !c.cancelled)
  // }
}
