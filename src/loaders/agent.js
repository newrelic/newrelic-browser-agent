// loader files
import { getEnabledFeatures } from './features/enabled-features'
import { configure } from './configure/configure'
import { getFeatureDependencyNames } from './features/featureDependencies'
import { featurePriority, FEATURE_NAMES } from './features/features'
// required features
import { Instrument as PageViewEvent } from '../features/page_view_event/instrument'
// common files
import { Aggregator } from '../common/aggregate/aggregator'
import { gosNREUM, gosNREUMInitializedAgents } from '../common/window/nreum'
import { generateRandomHexString } from '../common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '../common/config/config'
import { warn } from '../common/util/console'

/**
 * A flexible class that may be used to compose an agent from a select subset of feature modules. In applications
 * sensitive to network load, this may result in smaller builds with slightly lower performance impact.
 */
export class Agent {
  constructor (options, agentIdentifier = generateRandomHexString(16)) {
    this.agentIdentifier = agentIdentifier
    this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
    this.features = {}

    this.desiredFeatures = new Set(options.features || []) // expected to be a list of static Instrument/InstrumentBase classes, see "spa.js" for example

    // For Now... ALL agents must make the rum call whether the page_view_event feature was enabled or not.
    // NR1 creates an index on the rum call, and if not seen for a few days, will remove the browser app!
    // Future work is being planned to evaluate removing this behavior from the backend, but for now we must ensure this call is made
    this.desiredFeatures.add(PageViewEvent)

    Object.assign(this, configure(this.agentIdentifier, options, options.loaderType || 'agent'))

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
    const NR_FEATURES_REF_NAME = 'features'
    // Attempt to initialize all the requested features (sequentially in prio order & synchronously), with any failure aborting the whole process.
    try {
      const enabledFeatures = getEnabledFeatures(this.agentIdentifier)
      const featuresToStart = Array.from(this.desiredFeatures)
      featuresToStart.sort((a, b) => featurePriority[a.featureName] - featurePriority[b.featureName])
      featuresToStart.forEach(f => {
        // pageViewEvent must be enabled because RUM calls are not optional. See comment in constructor and PR 428.
        if (enabledFeatures[f.featureName] || f.featureName === FEATURE_NAMES.pageViewEvent) {
          const dependencies = getFeatureDependencyNames(f.featureName)
          const hasAllDeps = dependencies.every(x => enabledFeatures[x])
          if (!hasAllDeps) warn(`${f.featureName} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)
          this.features[f.featureName] = new f(this.agentIdentifier, this.sharedAggregator)
        }
      })
      gosNREUMInitializedAgents(this.agentIdentifier, this.features, NR_FEATURES_REF_NAME)
    } catch (err) {
      warn('Failed to initialize all enabled instrument classes (agent aborted) -', err)
      for (const featName in this.features) { // this.features hold only features that have been instantiated
        this.features[featName].abortHandler?.()
      }

      const newrelic = gosNREUM()
      delete newrelic.initializedAgents[this.agentIdentifier]?.['api'] // prevent further calls to agent-specific APIs (see "configure.js")
      delete newrelic.initializedAgents[this.agentIdentifier]?.[NR_FEATURES_REF_NAME] // GC mem used internally by features
      delete this.sharedAggregator
      // Keep the initialized agent object with its configs for troubleshooting purposes.
      newrelic.ee?.abort() // set flag and clear global backlog
      delete newrelic.ee?.get(this.agentIdentifier) // clear this agent's own backlog too
      return false
    }
  }
}
