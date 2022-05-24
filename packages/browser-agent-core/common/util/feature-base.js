import {ee} from '../event-emitter/contextual-ee'

export class FeatureBase {
  constructor(agentIdentifier, aggregator) {
    this.agentIdentifier = agentIdentifier
    this.aggregator = aggregator
    this.ee = ee.get(agentIdentifier)
  }
}
