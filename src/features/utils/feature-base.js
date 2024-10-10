import { ee } from '../../common/event-emitter/contextual-ee'

export class FeatureBase {
  constructor (agentIdentifier, featureName) {
    /** @type {string} */
    this.agentIdentifier = agentIdentifier
    /** @type {import('../../common/event-emitter/contextual-ee').ee} */
    this.ee = ee.get(agentIdentifier)
    /** @type {string} */
    this.featureName = featureName
    /**
     * Blocked can be used to prevent aggregation and harvest after inititalization time of the feature.
     * This can currently happen if RUM response setToken flag is 0, which is tied to ingest account entitlement info.
     * @type {boolean}
     */
    this.blocked = false
  }
}
