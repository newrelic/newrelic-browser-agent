import { registerDrain } from "../../common/drain/drain"
import { FeatureBase } from "./feature-base"
import { onWindowLoad } from '../../common/window/load'
import { isWorkerScope } from "../../common/util/global-scope"
import { FEATURE_NAMES } from "../../loaders/features/features"

export class InstrumentBase extends FeatureBase {
  constructor(agentIdentifier, aggregator, featureName, auto = true) {
    super(agentIdentifier, aggregator, featureName)
    this.completed = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
    this.hasAggregator = false
    this.auto = auto

    if (auto && featureName !== FEATURE_NAMES.sessionTrace) registerDrain(agentIdentifier, featureName)
  }

  importAggregator() {
    try {
      if (this.hasAggregator || !this.auto) return
      this.hasAggregator = true
      const lazyLoad = async () => {
        const { Aggregate } = await import(`../../features/${this.featureName}/aggregate`)
        new Aggregate(this.agentIdentifier, this.aggregator)
        this.resolve()
      }
      // theres no window.load event on non-browser scopes, lazy load immediately
      if (isWorkerScope) lazyLoad()
      // try to stay out of the way of the window.load event, lazy load once that has finished.
      else onWindowLoad(() => lazyLoad(), true)
    } catch (err) {
      this.reject(err)
    }
  }
}