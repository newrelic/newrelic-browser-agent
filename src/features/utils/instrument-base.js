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
import { hasReplayPrerequisite } from '../session_replay/shared/utils'
import { canEnableSessionTracking } from './feature-gates'
import { single } from '../../common/util/invoke'

/**
 * Base class for instrumenting a feature.
 * @extends FeatureBase
 */
export class InstrumentBase extends FeatureBase {
  /**
   * Instantiate InstrumentBase.
   * @param {string} agentIdentifier - The unique ID of the instantiated agent (relative to global scope).
   * @param {string} featureName - The name of the feature module (used to construct file path).
   * @param {boolean} [auto=true] - Determines whether the feature should automatically register to have the draining
   *     of its pooled instrumentation data handled by the agent's centralized drain functionality, rather than draining
   *     immediately. Primarily useful for fine-grained control in tests.
   */
  constructor (thisAgentRef, featureName, auto = true) {
    super(thisAgentRef.agentIdentifier, featureName)
    this.auto = auto

    /** @type {Function | undefined} This should be set by any derived Instrument class if it has things to do when feature fails or is killed. */
    this.abortHandler = undefined

    /**
     * @type {import('./aggregate-base').AggregateBase} Holds the reference to the feature's aggregate module counterpart, if and after it has been initialized. This may not be assigned until after page loads!
     * The only purpose of this for now is to expose it to the NREUM interface, as the feature's instrument instance is already exposed.
    */
    this.featAggregate = undefined

    /**
     * @type {Promise} Assigned immediately after @see importAggregator runs. Serves as a signal for when the inner async fn finishes execution. Useful for features to await
     * one another if there are inter-features dependencies.
     * TODO: This is only used for the SPA feature component tests and should be refactored out.
    */
    this.onAggregateImported = undefined

    /** used in conjunction with newrelic.start() to defer harvesting in features */
    if (thisAgentRef.init[this.featureName].autoStart === false) this.auto = false
    /** if the feature requires opt-in (!auto-start), it will get registered once the api has been called */
    if (this.auto) registerDrain(thisAgentRef.agentIdentifier, featureName)
    else {
      this.ee.on('manual-start-all', single(() => {
        // register the feature to drain only once the API has been called, it will drain when importAggregator finishes for all the features
        // called by the api in that cycle
        registerDrain(thisAgentRef.agentIdentifier, this.featureName)
        this.auto = true
        this.importAggregator(thisAgentRef)
      }))
    }
  }

  /**
   * Lazy-load the latter part of the feature: its aggregator. This method is called by the first part of the feature
   * (the instrumentation) when instrumentation is complete.
   * @param thisAgentRef - reference to the base agent ancestor that this feature belongs to
   * @param {Object} [argsObjFromInstrument] - any values or references to pass down to aggregate
   * @returns void
   */
  importAggregator (thisAgentRef, argsObjFromInstrument = {}) {
    if (this.featAggregate || !this.auto) return

    let loadedSuccessfully
    this.onAggregateImported = new Promise(resolve => {
      loadedSuccessfully = resolve
    })

    const importLater = async () => {
      let session
      try {
        if (canEnableSessionTracking(this.agentIdentifier)) { // would require some setup before certain features start
          const { setupAgentSession } = await import(/* webpackChunkName: "session-manager" */ './agent-session')
          session = setupAgentSession(this.agentIdentifier)
        }
      } catch (e) {
        warn(20, e)
        this.ee.emit('internal-error', [e])
        if (this.featureName === FEATURE_NAMES.sessionReplay) this.abortHandler?.() // SR should stop recording if session DNE
      }

      // Create a single Aggregator for this agent if DNE yet; to be used by jserror endpoint features.
      if (!thisAgentRef.sharedAggregator) {
        const { Aggregator } = await import(/* webpackChunkName: "shared-aggregator" */ '../../common/aggregate/aggregator')
        thisAgentRef.sharedAggregator = new Aggregator()
      }

      /**
       * Note this try-catch differs from the one in Agent.run() in that it's placed later in a page's lifecycle and
       * it's only responsible for aborting its one specific feature, rather than all.
       */
      try {
        if (!this.#shouldImportAgg(this.featureName, session)) {
          drain(this.agentIdentifier, this.featureName)
          loadedSuccessfully(false) // aggregate module isn't loaded at all
          return
        }
        const { lazyFeatureLoader } = await import(/* webpackChunkName: "lazy-feature-loader" */ './lazy-feature-loader')
        const { Aggregate } = await lazyFeatureLoader(this.featureName, 'aggregate')
        this.featAggregate = new Aggregate(thisAgentRef, argsObjFromInstrument)
        loadedSuccessfully(true)
      } catch (e) {
        warn(34, e)
        this.abortHandler?.() // undo any important alterations made to the page
        // not supported yet but nice to do: "abort" this agent's EE for this feature specifically
        drain(this.agentIdentifier, this.featureName, true)
        loadedSuccessfully(false)
        if (this.ee) this.ee.abort()
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
 * @param {import('../../common/session/session-entity').SessionEntity} session
 * @returns
 */
  #shouldImportAgg (featureName, session) {
    switch (featureName) {
      case FEATURE_NAMES.sessionReplay: // the session manager must be initialized successfully for Replay & Trace features
        return hasReplayPrerequisite(this.agentIdentifier) && !!session
      case FEATURE_NAMES.sessionTrace:
        return !!session
      default:
        return true
    }
  }
}
