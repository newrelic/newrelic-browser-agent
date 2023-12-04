import { numeric } from '../../../common/serialize/bel-serializer'
import { NODE_TYPE } from '../constants'
import { BelNode } from './bel-node'

export class customEndNode extends BelNode {
  constructor (agentIdentifier, endTime) {
    super(agentIdentifier)
    this.belType = NODE_TYPE.CUSTOM_END
    this.end = endTime
  }

  serialize (parentStartTimestamp) {
    return [this.belType, numeric(this.end - parentStartTimestamp)].join(',')
  }
}
