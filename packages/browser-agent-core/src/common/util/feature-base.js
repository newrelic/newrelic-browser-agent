import {ee} from '../event-emitter/contextual-ee'

/**
 * FeatureBase contains shared properties across all feature inst and agg classes
 * @class
 */
export class FeatureBase {
  constructor(agentIdentifier, aggregator, externalFeatures = []) {
    /** @type {string} */
    this.agentIdentifier = agentIdentifier
    /** @type {Aggregator} */
    this.aggregator = aggregator
    /** @type {ContextualEE} */
    this.ee = ee.get(agentIdentifier)
    /** @type {Feature[]} */
    this.externalFeatures = externalFeatures
    /**
     * Blocked can be used to prevent aggregation and harvest after inititalization time of the feature.
     * This can currently happen if rum response setToken flag is 0, which is tied to ingest account entitlement info.
     * @type {boolean} 
     */
    this.blocked = false
  }
}
