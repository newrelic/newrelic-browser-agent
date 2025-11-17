/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// loader files
import { Instrument as PVE } from '../features/page_view_event/instrument'
import { getEnabledFeatures } from './features/enabled-features'
import { configure } from './configure/configure'
// core files
import { setNREUMInitializedAgent } from '../common/window/nreum'
import { FEATURE_NAMES } from './features/features'
import { warn } from '../common/util/console'
import { MicroAgentBase } from './micro-agent-base'
// api files that are not auto-instrumented
import { setupSetCustomAttributeAPI } from './api/setCustomAttribute'
import { setupSetUserIdAPI } from './api/setUserId'
import { setupSetApplicationVersionAPI } from './api/setApplicationVersion'
import { setupStartAPI } from './api/start'
import { setupNoticeErrorAPI } from './api/noticeError'
import { setupSetErrorHandlerAPI } from './api/setErrorHandler'
import { setupAddReleaseAPI } from './api/addRelease'
import { setupAddPageActionAPI } from './api/addPageAction'
import { setupRecordCustomEventAPI } from './api/recordCustomEvent'
import { setupFinishedAPI } from './api/finished'
import { setupLogAPI } from './api/log'
import { setupWrapLoggerAPI } from './api/wrapLogger'

const nonAutoFeatures = [
  FEATURE_NAMES.jserrors,
  FEATURE_NAMES.genericEvents,
  FEATURE_NAMES.metrics,
  FEATURE_NAMES.logging
]

/**
 * A minimal agent class designed to only respond to manual user input. As such, this class does not
 * automatically instrument. Instead, each MicroAgent instance will lazy load the required features and can support loading multiple instances on one page.
 * Out of the box, it can manually handle and report Page View, Page Action, and Error events.
 *
 * @note This loader strategy is slated to be deprecated and eventually removed in a future product release. For better memory usage, build size impacts, entity management and relationships -- a new strategy focused around using a single centralized browser agent instance is actively being worked on. Reach out by email to browser-agent@newrelic.com for more information or if you would like to participate in a limited preview when the feature is ready for early adoption.
 *
 * @see {@link https://www.npmjs.com/package/@newrelic/browser-agent#deploying-one-or-more-micro-agents-per-page} for more information in the documentation.
 */
export class MicroAgent extends MicroAgentBase {
  /**
   * @param {import('./agent').AgentOptions} options
   */
  constructor (options) {
    super()

    this.features = {}
    setNREUMInitializedAgent(this.agentIdentifier, this)

    configure(this, { ...options, runtime: { isolatedBacklog: true } }, options.loaderType || 'micro-agent')

    /** assign base agent-level API definitions */
    setupSetCustomAttributeAPI(this)
    setupSetUserIdAPI(this)
    setupSetApplicationVersionAPI(this)
    setupStartAPI(this)

    /** feature APIs that wont get set up automatically for the micro agent since it skips the inst file */
    /** jserrors */
    setupNoticeErrorAPI(this)
    setupSetErrorHandlerAPI(this)
    setupAddReleaseAPI(this)
    /** generic events */
    setupAddPageActionAPI(this)
    setupRecordCustomEventAPI(this)
    setupFinishedAPI(this)
    /** logging */
    setupLogAPI(this)
    setupWrapLoggerAPI(this)

    /**
     * Starts a set of agent features if not running in "autoStart" mode
     * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/start/}
     * @param {string|string[]} [featureNames] The feature name(s) to start.  If no name(s) are passed, all features will be started
     */
    this.start = (featureNames) => {
      try {
        if (featureNames === undefined || (Array.isArray(featureNames) && featureNames.length === 0)) featureNames = nonAutoFeatures
        else if (typeof featureNames === 'string') featureNames = [featureNames]

        if (featureNames.some(f => !nonAutoFeatures.includes(f))) warn(37, nonAutoFeatures)
        const enabledFeatures = getEnabledFeatures(this.init)

        try {
          // a biproduct of doing this is that the "session manager" is automatically handled through importing this feature
          this.features.page_view_event = new PVE(this)
        } catch (err) {
          warn(24, err)
        }

        this.features.page_view_event.onAggregateImported.then(() => {
          /* The following features do not import an "instrument" file, meaning they are only hooked up to the API.
          Since the missing instrument-base class handles drain-gating (racing behavior) and PVE handles some setup, these are chained until after PVE has finished initializing
          so as to avoid the race condition of things like session and sharedAggregator not being ready by features that uses them right away. */
          nonAutoFeatures.forEach(f => {
            if (enabledFeatures[f] && featureNames.includes(f)) {
              let lazyImport
              /** Define these imports with static strings to not break tools like roll-up */
              switch (f) {
                case 'jserrors':
                  lazyImport = import('../features/jserrors/aggregate')
                  break
                case 'generic_events':
                  lazyImport = import('../features/generic_events/aggregate')
                  break
                case 'metrics':
                  lazyImport = import('../features/metrics/aggregate')
                  break
                case 'logging':
                  lazyImport = import('../features/logging/aggregate')
                  break
              }
              lazyImport.then(({ Aggregate }) => {
                this.features[f] = new Aggregate(this)
                this.runtime.harvester.initializedAggregates.push(this.features[f]) // so that harvester will poll this feature agg on interval
              }).catch(err => warn(25, err))
            }
          })
        })
        return true
      } catch (err) {
        warn(26, err)
        return false
      }
    }

    this.start(nonAutoFeatures.filter(featureName => !!this.init[featureName].autoStart))
  }

  get config () {
    return {
      info: this.info,
      init: this.init,
      loader_config: this.loader_config,
      runtime: this.runtime
    }
  }

  get api () {
    return this
  }
}
