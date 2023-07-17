// loader files
import { Instrument as PVE } from '../features/page_view_event/instrument'
import { getEnabledFeatures } from './features/enabled-features'
import { configure } from './configure/configure'
// core files
import { Aggregator } from '../common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '../common/window/nreum'
import { generateRandomHexString } from '../common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '../common/config/config'
import { FEATURE_NAMES } from './features/features'
import { warn } from '../common/util/console'
import { onWindowLoad } from '../common/window/load'
import { AgentBase } from './agent-base'

const nonAutoFeatures = [
  FEATURE_NAMES.jserrors,
  FEATURE_NAMES.pageAction,
  FEATURE_NAMES.metrics
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
  constructor (options, agentIdentifier = generateRandomHexString(16)) {
    super()

    this.agentIdentifier = agentIdentifier
    this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
    this.features = {}

    Object.assign(this, configure(this.agentIdentifier, { ...options, runtime: { isolatedBacklog: true } }, options.loaderType || 'micro-agent'))

    this.start()
  }

  get config () {
    return {
      info: getInfo(this.agentIdentifier),
      init: getConfiguration(this.agentIdentifier),
      loader_config: getLoaderConfig(this.agentIdentifier),
      runtime: getRuntime(this.agentIdentifier)
    }
  }

  start () {
    try {
      const enabledFeatures = getEnabledFeatures(this.agentIdentifier)

      try {
        // a biproduct of doing this is that the "session manager" is automatically handled through importing this feature
        this.features.page_view_event = new PVE(this.agentIdentifier, this.sharedAggregator)
      } catch (err) {
        warn('Something prevented the agent from instrumenting.', err)
      }

      onWindowLoad(() => {
        // these features do not import an "instrument" file, meaning they are only hooked up to the API.
        nonAutoFeatures.forEach(f => {
          if (enabledFeatures[f]) {
            import(/* webpackChunkName: "lazy-feature-loader" */ '../features/utils/lazy-feature-loader').then(({ lazyFeatureLoader }) => {
              return lazyFeatureLoader(f, 'aggregate')
            }).then(({ Aggregate }) => {
              this.features[f] = new Aggregate(this.agentIdentifier, this.sharedAggregator)
            }).catch(err =>
              warn('Something prevented the agent from being downloaded.', err))
          }
        })
      })
      gosNREUMInitializedAgents(this.agentIdentifier, this.features, 'features')
      return this
    } catch (err) {
      warn('Failed to initialize instrument classes.', err)
      return false
    }
  }
}
