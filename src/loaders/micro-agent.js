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
    Object.assign(this, this.api) // the APIs should be available at the class level for micro-agent

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
        const enabledFeatures = getEnabledFeatures(this.agentIdentifier)

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
              import(/* webpackChunkName: "lazy-feature-loader" */ '../features/utils/lazy-feature-loader').then(({ lazyFeatureLoader }) => {
                return lazyFeatureLoader(f, 'aggregate')
              }).then(({ Aggregate }) => {
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
}
