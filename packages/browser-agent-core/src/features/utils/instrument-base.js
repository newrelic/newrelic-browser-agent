import { FeatureBase } from "./feature-base"

export class InstrumentBase extends FeatureBase {
    constructor(agentIdentifier, aggregator, featureName, auto = true) {
      super(agentIdentifier, aggregator, featureName)
      this.completed = new Promise((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      })
      this.hasAggregator = false
      this.auto = auto
    }
  
    async importAggregator() {
      try {
        if (this.hasAggregator || !this.auto) return 
        this.hasAggregator = true
        const { Aggregate } = await import(`../../features/${this.featureName}/aggregate`)
        new Aggregate(this.agentIdentifier, this.aggregator)
        this.resolve()
      } catch (err) {
        this.reject(err)
      }
    }
  }