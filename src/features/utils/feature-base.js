import { getInfo, isConfigured, getRuntime } from '../../common/config/config'
import { ee } from '../../common/event-emitter/contextual-ee'
import { configure } from '../../loaders/configure/configure'
import { gosCDN } from '../../common/window/nreum'

export class FeatureBase {
  constructor (agentIdentifier, aggregator, featureName) {
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
     * This can currently happen if rum response setToken flag is 0, which is tied to ingest account entitlement info.
     * @type {boolean}
     */
    this.blocked = false

    this.checkConfiguration()
  }

  checkConfiguration () {
    // try to support backwards compat with patter of some loader configs present after loader
    // would need the same jsAttributes handling as the main branch
    if (!isConfigured(this.agentIdentifier)) {
      let jsAttributes = { ...gosCDN().info?.jsAttributes }
      try {
        jsAttributes = {
          ...jsAttributes,
          ...getInfo(this.agentIdentifier)?.jsAttributes
        }
      } catch (err) {
        // do nothing
      }
      configure(this.agentIdentifier, {
        ...gosCDN(),
        info: {
          ...gosCDN().info,
          jsAttributes
        }
      })
    }
  }
}
