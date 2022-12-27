import { getInfo, isConfigured } from '../config/config'
import { ee } from '../event-emitter/contextual-ee'
import { configure } from '../../loader/configure'
import { gosCDN } from '../window/nreum'

class FeatureBase {
  constructor(agentIdentifier, aggregator, featureName) {
    this.agentIdentifier = agentIdentifier
    this.aggregator = aggregator
    this.ee = ee.get(agentIdentifier)
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
export class InstrumentBase extends FeatureBase {
  constructor(agentIdentifier, aggregator, featureName) {
    super(agentIdentifier, aggregator, featureName)
    this.completed = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
    this.hasAggregator = false
  }

  async importAggregator() {
    try {
      if (this.hasAggregator) return 
      this.hasAggregator = true
      const { Aggregate } = await import(`../../features/${this.featureName}/aggregate`)
      new Aggregate(this.agentIdentifier, this.aggregator)
      this.resolve()
    } catch (err) {
      this.reject(err)
    }
  }
}

export class AggregateBase extends FeatureBase {
  constructor(agentIdentifier, aggregator, featureName) {
    super(agentIdentifier, aggregator, featureName)
  }
}