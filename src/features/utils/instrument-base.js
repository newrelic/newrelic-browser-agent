/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Defines `InstrumentBase` to be used as the super of the Instrument classes implemented by each feature.
 * Validates and loads feature aggregates, including a one-time late configuration check before import.
 * Inherits `blocked` behavior from [FeatureBase]{@link ./feature-base}.
 */

import { drain, registerDrain } from '../../common/drain/drain'
import { FeatureBase } from './feature-base'
import { onWindowLoad } from '../../common/window/load'
import { isBrowserScope } from '../../common/constants/runtime'
import { warn } from '../../common/util/console'
import { isValid } from '../../common/config/info'
import { configure } from '../../loaders/configure/configure'
import { gosCDN } from '../../common/window/nreum'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { hasReplayPrerequisite } from '../session_replay/shared/utils'
import { canEnableSessionTracking } from './feature-gates'
import { single } from '../../common/util/invoke'
import { SESSION_ERROR } from '../../common/constants/agent-constants'
import { handle } from '../../common/event-emitter/handle'

const checkedAgents = new WeakSet()
const runtimeBootstrapPromises = new WeakMap()

/**
 * Base class for instrumenting a feature.
 * @extends FeatureBase
 */
export class InstrumentBase extends FeatureBase {
  /**
   * Instantiate InstrumentBase.
   * @param {Object} agentRef - The agent reference object.
   * @param {string} featureName - The name of the feature module (used to construct file path).
   */
  constructor (agentRef, featureName) {
    super(agentRef, featureName)

    /** @type {string} used to label this instance's debug() output, see FeatureBase#debug */
    this.moduleType = 'instrument'

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
    */
    this.loadedSuccessfully = undefined
    this.onAggregateImported = new Promise(resolve => {
      this.loadedSuccessfully = resolve
    })

    /**
     * used in conjunction with newrelic.start() to defer harvesting in features
     * @type {Promise} Resolves when the feature is ready to import its aggregator, either immediately or after the start API has been called if the feature is autoStart: false.
    */
    this.deferred = Promise.resolve()

    if (agentRef.init[this.featureName].autoStart === false) {
      this.deferred = new Promise((resolve, reject) => {
        this.ee.on('manual-start-all', single(() => {
        // register the feature to drain only once the API has been called, it will drain when importAggregator finishes for all the features
        // called by the api in that cycle
          registerDrain(agentRef, this.featureName)
          resolve()
        }))
      })
    } else {
      /** if the feature requires opt-in (!auto-start), it will get registered once the api has been called */
      registerDrain(agentRef, featureName)
    }
  }

  /**
   * Turns on console.debug logging for this instrument, and cascades to its aggregate -- whether
   * the aggregate has already been lazy-loaded (see importAggregator) or loads later -- using the
   * same opts. See FeatureBase#debug for opts.
   */
  debug (opts = {}) {
    super.debug(opts)
    this.featAggregate?.debug(opts)
  }

  /**
   * Lazy-load the latter part of the feature: its aggregator. This method is called by the first part of the feature
   * (the instrumentation) when instrumentation is complete.
   * @param {Object} agentRef - reference to the base agent ancestor that this feature belongs to
   * @param {Function} fetchAggregator - a function that returns a promise that resolves to the aggregate module
   * @param {Object} [argsObjFromInstrument] - any values or references to pass down to aggregate
   * @returns
   */
  importAggregator (agentRef, fetchAggregator, argsObjFromInstrument = {}) {
    if (this.featAggregate) return

    const importLater = async () => {
      // wait for the deferred promise to resolve before proceeding
      // this will resolve immediately if the feature is auto-started,
      // or otherwise when the manual-start-all event is emitted by the start API
      await this.deferred

      this.#checkConfiguration(agentRef) // check for late-appearing 'info' config on the page
      if (!isValid(agentRef.info)) { // if there still isn't valid info, then we can't proceed with session setup or importing the aggregates
        warn(43)
        agentRef.ee.abort()
        this.loadedSuccessfully(false)
        return
      }

      try { // in the interest of keeping loader file size small, some modules are lazy-loaded as part of the larger async chunk
        await ensureRuntimeBootstrap(agentRef, this.ee, this.featureName)
      } catch (e) {
        warn(79, e)
        this.ee.abort() // failed Connector or Harvester will cause entire agent to shutdown
        this.loadedSuccessfully(false)
        return
      }

      /**
       * Note this try-catch differs from the one in Agent.run() in that it's placed later in a page's lifecycle and
       * it's only responsible for aborting its one specific feature, rather than all.
       */
      try {
        if (!this.#shouldImportAgg(this.featureName, agentRef.runtime.session, agentRef.init)) {
          this.abortHandler?.()
          drain(this.agentRef, this.featureName)
          this.loadedSuccessfully(false) // aggregate module isn't loaded at all
          return
        }
        const { Aggregate } = await fetchAggregator()

        this.featAggregate = new Aggregate(agentRef, argsObjFromInstrument)
        if (this.__nrDebug) this.featAggregate.debug(this.__nrDebugOpts) // propagate a debug() call made on the instrument before its aggregate existed yet, with the same opts

        agentRef.runtime.harvester.initializedAggregates.push(this.featAggregate) // "subscribe" the feature to future harvest intervals
        this.loadedSuccessfully(true)
      } catch (e) {
        warn(34, e)
        this.abortHandler?.()
        // not supported yet but nice to do: "abort" this agent's EE for this feature specifically
        drain(this.agentRef, this.featureName, true)
        this.loadedSuccessfully(false)
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
  #shouldImportAgg (featureName, session, agentInit) {
    if (this.blocked) return false
    switch (featureName) {
      case FEATURE_NAMES.sessionReplay: // the session manager must be initialized successfully for Replay & Trace features
        return hasReplayPrerequisite(agentInit) && !!session
      case FEATURE_NAMES.sessionTrace:
        return !!session
      default:
        return true
    }
  }

  /**
   * Checks for additional `jsAttributes` items to support backward compatibility with implementations of the agent where
   * loader configurations may appear after the loader code is executed.
   */
  #checkConfiguration (existingAgent) {
    if (checkedAgents.has(existingAgent)) return
    checkedAgents.add(existingAgent)
    // NOTE: This check has to happen at load time
    if (!isValid(existingAgent.info)) {
      const cdn = gosCDN()
      let jsAttributes = { ...cdn.info?.jsAttributes }
      try {
        jsAttributes = {
          ...jsAttributes,
          ...existingAgent.info?.jsAttributes
        }
      } catch (err) {
        // do nothing
      }
      configure(existingAgent, {
        ...cdn,
        info: {
          ...cdn.info,
          jsAttributes
        },
        runtime: existingAgent.runtime
      }, existingAgent.runtime.loaderType)
    }
  }
}

/**
 * Lazily initializes the shared runtime bootstrap for a given agent exactly once. This loads session setup, Connector, and
 * Harvester through shared async chunks and returns the same in-flight Promise to any concurrent callers.
 *
 * Session setup failures are reported but do not stop bootstrap. Connector or Harvester failures are allowed to bubble so the caller can abort the agent.
 *
 * @param {Object} agentRef - The agent reference object.
 * @param {Object} ee - The feature event emitter used for error reporting.
 * @param {string} featureName - The feature name used when reporting session setup errors.
 * @returns {Promise<void>} Resolves when the shared bootstrap completes.
 */
async function ensureRuntimeBootstrap (agentRef, ee, featureName) {
  if (runtimeBootstrapPromises.has(agentRef)) return runtimeBootstrapPromises.get(agentRef)

  const bootstrapPromise = (async () => {
    if (canEnableSessionTracking(agentRef.init)) {
      try {
        const { setupAgentSession } = await import(/* webpackChunkName: "session-manager" */ './agent-session')
        setupAgentSession(agentRef) // sets agentRef.runtime.session, if successful
      } catch (e) {
        warn(20, e)
        ee.emit('internal-error', [e])
        handle(SESSION_ERROR, [e], undefined, featureName, ee)
      }
    }
    if (agentRef.init.api.register.allow_iframe_bridge) {
      try {
        // This chunk doesn't exist in the lite build (see webpack IgnorePlugin config) since none
        // of lite's features wire up agent.register -- guard against that rather than letting an
        // unhandled rejection surface if this flag is ever set on a lite page.
        const { setupIframeMFEMessageListener } = await import(/* webpackChunkName: "iframe-message-handler" */ '../../loaders/configure/iframe-message-handler')
        setupIframeMFEMessageListener(agentRef)
      } catch (e) {
        warn(23, e)
      }
    }

    const [{ Connector }, { Harvester }] = await Promise.all([
      import(/* webpackChunkName: "connector" */ '../../common/harvest/connector'),
      import(/* webpackChunkName: "harvester" */ '../../common/harvest/harvester')
    ])
    agentRef.runtime.connector = new Connector(agentRef)
    agentRef.runtime.harvester = new Harvester(agentRef)

    /* Wait for auto-started features' aggregates to load before starting the harvest timer, so Harvester's EOL
    listener registers after aggregate-level listeners like web-vitals' CWV APIs. Not awaited here to avoid
    deadlock, since every feature awaits this same bootstrap promise before its own aggregate load.
    Only auto-started features are waited on: an autoStart:false feature only registers in drainRegistry once
    `start` is called, so filtering on that registry excludes any feature that's never started instead of
    blocking startTimer() forever. */
    const autoStartedFeatures = Object.values(agentRef.features).filter(feature => agentRef.runtime.drainRegistry.has(feature.featureName))
    Promise.all(autoStartedFeatures.map(feature => feature.onAggregateImported))
      .then(() => agentRef.runtime.harvester.startTimer())
  })()

  runtimeBootstrapPromises.set(agentRef, bootstrapPromise)
  await bootstrapPromise
}
