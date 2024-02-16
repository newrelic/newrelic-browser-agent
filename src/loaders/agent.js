// important side effects
import './configure/public-path'
import './configure/nonce'
// loader files
import { AgentBase } from './agent-base'
import { getEnabledFeatures } from './features/enabled-features'
import { configure } from './configure/configure'
import { getFeatureDependencyNames } from './features/featureDependencies'
import { featurePriority, FEATURE_NAMES } from './features/features'
// required features
import { Instrument as PageViewEvent } from '../features/page_view_event/instrument'
// common files
import { Aggregator } from '../common/aggregate/aggregator'
import { gosNREUM, setNREUMInitializedAgent } from '../common/window/nreum'
import { generateRandomHexString } from '../common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '../common/config/config'
import { warn } from '../common/util/console'
import { stringify } from '../common/util/stringify'
import { globalScope } from '../common/constants/runtime'
import { ee } from '../common/event-emitter/contextual-ee'

/**
 * A flexible class that may be used to compose an agent from a select subset of feature modules. In applications
 * sensitive to network load, this may result in smaller builds with slightly lower performance impact.
 */
export class Agent extends AgentBase {
  constructor (options, agentIdentifier = generateRandomHexString(16)) {
    super()

    if (!globalScope) {
      // We could not determine the runtime environment. Short-circuite the agent here
      // to avoid possible exceptions later that may cause issues with customer's application.
      warn('Failed to initial the agent. Could not determine the runtime environment.')
      return
    }

    this.agentIdentifier = agentIdentifier
    this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
    this.features = {}
    this.ee = ee.get(this.agentIdentifier)
    setNREUMInitializedAgent(agentIdentifier, this) // append this agent onto the global NREUM.initializedAgents

    this.desiredFeatures = new Set(options.features || []) // expected to be a list of static Instrument/InstrumentBase classes, see "spa.js" for example
    // For Now... ALL agents must make the rum call whether the page_view_event feature was enabled or not.
    // NR1 creates an index on the rum call, and if not seen for a few days, will remove the browser app!
    // Future work is being planned to evaluate removing this behavior from the backend, but for now we must ensure this call is made
    this.desiredFeatures.add(PageViewEvent)

    configure(this, options, options.loaderType || 'agent') // add api, exposed, and other config properties

    this.run()
  }

  get config () {
    return {
      info: getInfo(this.agentIdentifier),
      init: getConfiguration(this.agentIdentifier),
      loader_config: getLoaderConfig(this.agentIdentifier),
      runtime: getRuntime(this.agentIdentifier)
    }
  }

  run () {
    // Attempt to initialize all the requested features (sequentially in prio order & synchronously), with any failure aborting the whole process.
    try {
      const enabledFeatures = getEnabledFeatures(this.agentIdentifier)
      const featuresToStart = [...this.desiredFeatures]
      featuresToStart.sort((a, b) => featurePriority[a.featureName] - featurePriority[b.featureName])
      featuresToStart.forEach(InstrumentCtor => {
        // pageViewEvent must be enabled because RUM calls are not optional. See comment in constructor and PR 428.
        if (enabledFeatures[InstrumentCtor.featureName] || InstrumentCtor.featureName === FEATURE_NAMES.pageViewEvent) {
          const dependencies = getFeatureDependencyNames(InstrumentCtor.featureName)
          const hasAllDeps = dependencies.every(x => enabledFeatures[x])
          if (!hasAllDeps) warn(`${InstrumentCtor.featureName} is enabled but one or more dependent features has been disabled (${stringify(dependencies)}). This may cause unintended consequences or missing data...`)
          this.features[InstrumentCtor.featureName] = new InstrumentCtor(this.agentIdentifier, this.sharedAggregator)
        }
      })
    } catch (err) {
      warn('Failed to initialize all enabled instrument classes (agent aborted) -', err)
      for (const featName in this.features) { // this.features hold only features that have been instantiated
        this.features[featName].abortHandler?.()
      }

      const newrelic = gosNREUM()
      delete newrelic.initializedAgents[this.agentIdentifier]?.api // prevent further calls to agent-specific APIs (see "configure.js")
      delete newrelic.initializedAgents[this.agentIdentifier]?.features // GC mem used internally by features
      delete this.sharedAggregator
      // Keep the initialized agent object with its configs for troubleshooting purposes.
      const thisEE = newrelic.ee.get(this.agentIdentifier)
      thisEE.aborted = true // set flag and clear backlog
      return false
    }
  }
}
