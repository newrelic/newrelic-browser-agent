import { getRuntime } from '../../common/config/config'
import { ee } from '../../common/event-emitter/contextual-ee'

export class FeatureBase {
  constructor (agentIdentifier, aggregator, featureName, init = {}) {
    /** @type {string} */
    this.agentIdentifier = agentIdentifier
    /** @type {Aggregator} */
    this.aggregator = aggregator
    /** @type {ContextualEE} */
    this.ee = ee.get(agentIdentifier, getRuntime(this.agentIdentifier).isolatedBacklog)
    /** @type {string} */
    this.featureName = featureName
    /**
     * Blocked can be used to prevent aggregation and harvest after inititalization time of the feature.
     * This can currently happen if RUM response setToken flag is 0, which is tied to ingest account entitlement info.
     * @type {boolean}
     */
    this.blocked = false

    this.init = init
  }
}
