/**
 * @file Defines `InstrumentBase` to be used as the super of the Instrument classes implemented by each feature.
 * Inherits and executes the `checkConfiguration` method from [FeatureBase]{@link ./feature-base}, which also
 * exposes the `blocked` property.
 */

import { drain, registerDrain } from '../../common/drain/drain'
import { FeatureBase } from './feature-base'
import { onWindowLoad } from '../../common/window/load'
import { isBrowserScope } from '../../common/constants/runtime'
import { warn } from '../../common/util/console'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { getConfigurationValue } from '../../common/config/config'

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
    this.auto = auto

    /** @type {Function | undefined} This should be set by any derived Instrument class if it has things to do when feature fails or is killed. */
    this.abortHandler
    /**
     * @type {Class} Holds the reference to the feature's aggregate module counterpart, if and after it has been initialized. This may not be assigned until after page loads!
     * The only purpose of this for now is to expose it to the NREUM interface, as the feature's instrument instance is already exposed.
    */
    this.featAggregate
    /**
     * @type {Promise} Assigned immediately after @see importAggregator runs. Serves as a signal for when the inner async fn finishes execution. Useful for features to await
     * one another if there are inter-features dependencies.
    */
    this.onAggregateImported

    if (auto) registerDrain(agentIdentifier, featureName)
  }

  /**
   * Lazy-load the latter part of the feature: its aggregator. This method is called by the first part of the feature
   * (the instrumentation) when instrumentation is complete.
   * @param {Object} [argsObjFromInstrument] - any values or references to pass down to aggregate
   * @returns void
   */
  importAggregator (argsObjFromInstrument = {}) {
    if (this.featAggregate || !this.auto) return
    const enableSessionTracking = isBrowserScope && getConfigurationValue(this.agentIdentifier, 'privacy.cookies_enabled') === true
    let loadedSuccessfully, loadFailed
    this.onAggregateImported = new Promise((resolve, reject) => {
      loadedSuccessfully = resolve; loadFailed = reject
    })

    const importLater = async () => {
      let session
      try {
        if (enableSessionTracking) { // would require some setup before certain features start
          const { setupAgentSession } = await import(/* webpackChunkName: "session-manager" */ './agent-session')
          session = setupAgentSession(this.agentIdentifier)
        }
      } catch (e) {
        warn('A problem occurred when starting up session manager. This page will not start or extend any session.', e)
      }

      /**
       * Note this try-catch differs from the one in Agent.start() in that it's placed later in a page's lifecycle and
       * it's only responsible for aborting its one specific feature, rather than all.
       */
      try {
        if (!this.shouldImportAgg(this.featureName, session)) {
          drain(this.agentIdentifier, this.featureName)
          return
        }
        const { lazyFeatureLoader } = await import(/* webpackChunkName: "lazy-feature-loader" */ './lazy-feature-loader')
        const { Aggregate } = await lazyFeatureLoader(this.featureName, 'aggregate')
        this.featAggregate = new Aggregate(this.agentIdentifier, this.aggregator, argsObjFromInstrument)
        loadedSuccessfully()
      } catch (e) {
        warn(`Downloading and initializing ${this.featureName} failed...`, e)
        this.abortHandler?.() // undo any important alterations made to the page
        // not supported yet but nice to do: "abort" this agent's EE for this feature specifically
        loadFailed()
      }
    }

    // For regular web pages, we want to wait and lazy-load the aggregator only after all page resources are loaded.
    // Non-browser scopes (i.e. workers) have no `window.load` event, so the aggregator can be lazy-loaded immediately.
    if (!isBrowserScope) importLater()
    else onWindowLoad(() => importLater(), true)
  }

  /**
 * Make a determination if an aggregate class should even be imported
 * @param {string} featureName
 * @param {SessionEntity} session
 * @returns
 */
  shouldImportAgg (featureName, session) {
  // if this isnt the FIRST load of a session AND
  // we are not actively recording SR... DO NOT run the aggregator
  // session replay samples can only be decided on the first load of a session
  // session replays can continue if in progress
    if (featureName === FEATURE_NAMES.sessionReplay) {
      if (getConfigurationValue(this.agentIdentifier, 'session_trace.enabled') === false) return false
      return !!session?.isNew || !!session?.state.sessionReplay
    }
    // todo -- add case like above for session trace
    return true
  }
}
