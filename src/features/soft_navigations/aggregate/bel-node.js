import { TimeKeeper } from '../../../common/timing/time-keeper'

let nodesSeen = 0

export class BelNode {
  belType
  /** List of other BelNode derivatives. Each children should be of a subclass that implements its own 'serialize' function. */
  children = []
  start = TimeKeeper.now()
  end
  callbackEnd = 0
  callbackDuration = 0
  nodeId = ++nodesSeen

  constructor (agentIdentifier) {
    if (!agentIdentifier) throw new Error('Interaction is missing core attributes')
    this.agentIdentifier = agentIdentifier
  }

  addChild (child) {
    this.children.push(child)
  }

  /** Virtual fn for stringifying an instance. */
  serialize () {}
}
