import {ee} from '../event-emitter/contextual-ee'

export class FeatureBase {
  constructor(agentIdentifier, aggregator, externalFeatures = []) {
    this.agentIdentifier = agentIdentifier
    this.aggregator = aggregator
    this.ee = ee.get(agentIdentifier)
    this.externalFeatures = externalFeatures
  }
}
