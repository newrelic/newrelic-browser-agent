import { registerDrain } from "../../common/drain/drain"
import { FeatureBase } from "./feature-base"
import { onWindowLoad } from '../../common/window/load'
import { isWorkerScope } from "../../common/util/global-scope"
import { warn } from '../../common/util/console'

export class InstrumentBase extends FeatureBase {
  constructor(agentIdentifier, aggregator, featureName, auto = true) {
    super(agentIdentifier, aggregator, featureName)
    this.hasAggregator = false
    this.auto = auto

    /** @type {Function | undefined} This should be set by any derived Instrument class if it has things to do when feature fails or is killed. */
    this.abortHandler;

    if (auto) registerDrain(agentIdentifier, featureName)
  }

  /** This is responsible for pulling in and executing the latter part of the feature--its aggregator. The first part--the instrumentation--should call this at the end of its setup. */
  importAggregator() {
    if (this.hasAggregator || !this.auto) return
    this.hasAggregator = true
    const lazyLoad = async () => {
      try {
        const { lazyLoader } = await import(/* webpackChunkName: "lazy-loader" */ './lazy-loader')
        const { Aggregate } = await lazyLoader(this.featureName, 'aggregate');
        new Aggregate(this.agentIdentifier, this.aggregator);
        this.resolve();
      } catch (e) {
        warn('Something prevented the agent from being downloaded.')
        return null
      }
    }

    // Workers have no window load event, and so it's okay to run the feature's aggregator asap. For web UI, it should wait for the window to load first.
    if (isWorkerScope) importLater();
    else onWindowLoad(() => importLater(), true);
  }
}
