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
     * This can currently happen if RUM response setToken flag is 0, which is tied to ingest account entitlement info.
     * @type {boolean}
     */
    this.blocked = false

    this.checkConfiguration()
  }

  /**
   * Checks for additional `jsAttributes` items to support backward compatibility with implementations of the agent where
   * loader configurations may appear after the loader code is executed.
   */
  checkConfiguration () {
    // NOTE: This check has to happen at aggregator load time, but could be moved to `AggregateBase`.
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
