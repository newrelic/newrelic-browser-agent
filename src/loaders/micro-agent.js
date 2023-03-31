// loader files
import { getEnabledFeatures } from './features/enabled-features'
import { configure } from './configure/configure'
// core files
import { Aggregator } from '../common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '../common/window/nreum'
import { generateRandomHexString } from '../common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '../common/config/config'
import { FEATURE_NAMES } from './features/features'
import { warn } from '../common/util/console'

const nonAutoFeatures = [
  FEATURE_NAMES.jserrors,
  FEATURE_NAMES.pageAction
]

const autoFeatures = [
  FEATURE_NAMES.metrics
]

/**
 * A minimal agent class designed to be loaded multiple times on the same page, each instance narrowly scoped to the
 * concerns of a particular component, as with the micro-frontend architectural pattern. This class does not
 * automatically instrument. Instead, each MicroAgent instance may be configured to lazy-load specific
 * instrumentations at runtime, and to report desired data, events, and errors programatically.
 */
export class MicroAgent {
  /**
   * @param {Object} options - Specifies features and runtime configuration,
   * @param {string=} agentIdentifier - The optional unique ID of the agent.
   */
  constructor (options, agentIdentifier = generateRandomHexString(16)) {
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
      autoFeatures.forEach(f => {
        if (enabledFeatures[f]) {
          // TODO - THIS does not work, the instrument switch in lazy loader increases the size of the worker build.  Needs to be revisited
          import(/* webpackChunkName: "lazy-loader" */ '../features/utils/lazy-loader').then(({ lazyLoader }) => {
            return lazyLoader(f, 'instrument')
          }).then(({ Instrument }) => {
            this.features[f] = new Instrument(this.agentIdentifier, this.sharedAggregator)
          }).catch(err =>
            warn('Something prevented the agent from being downloaded.'))
        }
      })
      nonAutoFeatures.forEach(f => {
        if (enabledFeatures[f]) {
          // TODO - THIS does not work, the instrument switch in lazy loader increases the size of the worker build.  Needs to be revisited
          // Parts of the lazy-loader were removed because webpack was transpiling them into the worker build, errantly inflating the build size.
          import(/* webpackChunkName: "lazy-loader" */ '../features/utils/lazy-loader').then(({ lazyLoader }) => {
            return lazyLoader(f, 'aggregate')
          }).then(({ Aggregate }) => {
            this.features[f] = new Aggregate(this.agentIdentifier, this.sharedAggregator)
          }).catch(err =>
            warn('Something prevented the agent from being downloaded.'))
        }
      })
      gosNREUMInitializedAgents(this.agentIdentifier, this.features, 'features')
      return this
    } catch (err) {
      warn('Failed to initialize instrument classes.', err)
      return false
    }
  }
}
