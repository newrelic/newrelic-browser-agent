/**
 * @file Defines `InstrumentBase` to be used as the super of the Instrument classes implemented by each feature.
 * Inherits and executes the `checkConfiguration` method from [FeatureBase]{@link ./feature-base}, which also
 * exposes the `blocked` property.
 */

import { registerDrain } from '../../common/drain/drain'
import { FeatureBase } from './feature-base'
import { onWindowLoad } from '../../common/window/load'
import { isWorkerScope } from '../../common/util/global-scope'
import { warn } from '../../common/util/console'

/**
 * Base class for instrumenting a feature.
 * @extends FeatureBase
 */
export class InstrumentBase extends FeatureBase {
  /**
   * Instantiate InstrumentBase.
   * @param {string} agentIdentifier - The unique ID of the instantiated agent (relative to global scope).
   * @param {Aggregator} aggregator - The shared Aggregator that will handle batching and reporting of data.
   * @param {string} featureName - The name of the feature module (used to construct file path).
   * @param {boolean} [auto=true] - Determines whether the feature should automatically register to have the draining
   *     of its pooled instrumentation data handled by the agent's centralized drain functionality, rather than draining
   *     immediately. Primarily useful for fine-grained control in tests.
   */
  constructor (agentIdentifier, aggregator, featureName, auto = true) {
    super(agentIdentifier, aggregator, featureName)
    this.hasAggregator = false
    this.auto = auto

    /** @type {Function | undefined} This should be set by any derived Instrument class if it has things to do when feature fails or is killed. */
    this.abortHandler

    if (auto) registerDrain(agentIdentifier, featureName)
  }

  /**
   * Lazy-load the latter part of the feature: its aggregator. This method is called by the first part of the feature
   * (the instrumentation) when instrumentation is complete.
   */
  importAggregator () {
    if (this.hasAggregator || !this.auto) return
    this.hasAggregator = true

    const importLater = async () => {
      /**
       * Note this try-catch differs from the one in Agent.start() in that it's placed later in a page's lifecycle and
       * it's only responsible for aborting its one specific feature, rather than all.
       */
      try {
        const { lazyLoader } = await import(/* webpackChunkName: "lazy-loader" */ './lazy-loader')
        const { Aggregate } = await lazyLoader(this.featureName, 'aggregate')
        new Aggregate(this.agentIdentifier, this.aggregator)
      } catch (e) {
        warn(`Downloading ${this.featureName} failed...`)
        this.abortHandler?.() // undo any important alterations made to the page

        // not supported yet but nice to do: "abort" this agent's EE for this feature specifically
      }
    }

    // For regular web pages, we want to wait and lazy-load the aggregator only after all page resources are loaded.
    // Non-browser scopes (i.e. workers) have no `window.load` event, so the aggregator can be lazy-loaded immediately.
    if (isWorkerScope) importLater()
    else onWindowLoad(() => importLater(), true)
  }
}
