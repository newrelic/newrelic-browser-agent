import { getInfo, isConfigured, getRuntime } from '../../common/config/config'
import { ee } from '../../common/event-emitter/contextual-ee'
import { configure } from '../../loader/configure/configure'
import { gosCDN } from '../../common/window/nreum'

export class FeatureBase {
  constructor(agentIdentifier, aggregator, featureName) {
    this.agentIdentifier = agentIdentifier
    this.aggregator = aggregator
    this.ee = ee.get(agentIdentifier, getRuntime(this.agentIdentifier).isolatedBacklog)
    this.featureName = featureName

    this.checkConfiguration()
  }

  checkConfiguration() {
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
