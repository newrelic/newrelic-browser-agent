// loader files
import { Instrument as PVE } from '../features/page_view_event/instrument'
import { getEnabledFeatures } from './features/enabled-features'
import { configure } from './configure/configure'
// core files
import { setNREUMInitializedAgent } from '../common/window/nreum'
import { getInfo } from '../common/config/info'
import { getConfiguration, getConfigurationValue } from '../common/config/init'
import { getLoaderConfig } from '../common/config/loader-config'
import { getRuntime } from '../common/config/runtime'
import { FEATURE_NAMES } from './features/features'
import { warn } from '../common/util/console'
import { AgentBase } from './agent-base'

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
export class MicroAgent extends AgentBase {
  /**
   * @param {Object} options - Specifies features and runtime configuration,
   * @param {string=} agentIdentifier - The optional unique ID of the agent.
   */
  constructor (options, agentIdentifier) {
    super(agentIdentifier)

    this.features = {}
    setNREUMInitializedAgent(this.agentIdentifier, this)

    configure(this, { ...options, runtime: { isolatedBacklog: true } }, options.loaderType || 'micro-agent')
    Object.assign(this, this.api) // the APIs should be available at the class level for micro-agent

    /**
     * Starts a set of agent features if not running in "autoStart" mode
     * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/start/}
     * @param {string|string[]|undefined} name The feature name(s) to start.  If no name(s) are passed, all features will be started
     */
    this.start = features => this.run(features)
    this.run(nonAutoFeatures.filter(featureName => getConfigurationValue(this.agentIdentifier, `${featureName}.autoStart`)))
  }

  get config () {
    return {
      info: getInfo(this.agentIdentifier),
      init: getConfiguration(this.agentIdentifier),
      loader_config: getLoaderConfig(this.agentIdentifier),
      runtime: getRuntime(this.agentIdentifier)
    }
  }

  run (features) {
    try {
      const featNames = nonAutoFeatures
      if (features === undefined) features = featNames
      else {
        features = Array.isArray(features) && features.length ? features : [features]
        if (features.some(f => !featNames.includes(f))) return warn(37, featNames)
        if (!features.includes(FEATURE_NAMES.pageViewEvent)) features.push(FEATURE_NAMES.pageViewEvent)
      }
    } catch (err) {
      warn(23, err)
    }

    try {
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
          if (enabledFeatures[f] && features.includes(f)) {
            import(/* webpackChunkName: "lazy-feature-loader" */ '../features/utils/lazy-feature-loader').then(({ lazyFeatureLoader }) => {
              return lazyFeatureLoader(f, 'aggregate')
            }).then(({ Aggregate }) => {
              this.features[f] = new Aggregate(this)
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
}
