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
import { gosNREUM, gosNREUMInitializedAgents } from '../common/window/nreum'
import { generateRandomHexString } from '../common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '../common/config/config'
import { warn } from '../common/util/console'
import { stringify } from '../common/util/stringify'
import { globalScope } from '../common/constants/runtime'

/**
 * @typedef {import('./api/interaction-types').InteractionInstance} InteractionInstance
 */

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
      const featuresToStart = [...this.desiredFeatures]
      featuresToStart.sort((a, b) => featurePriority[a.featureName] - featurePriority[b.featureName])
      featuresToStart.forEach(f => {
        // pageViewEvent must be enabled because RUM calls are not optional. See comment in constructor and PR 428.
        if (enabledFeatures[f.featureName] || f.featureName === FEATURE_NAMES.pageViewEvent) {
          const dependencies = getFeatureDependencyNames(f.featureName)
          const hasAllDeps = dependencies.every(x => enabledFeatures[x])
          if (!hasAllDeps) warn(`${f.featureName} is enabled but one or more dependent features has been disabled (${stringify(dependencies)}). This may cause unintended consequences or missing data...`)
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
      delete newrelic.initializedAgents[this.agentIdentifier]?.api // prevent further calls to agent-specific APIs (see "configure.js")
      delete newrelic.initializedAgents[this.agentIdentifier]?.[NR_FEATURES_REF_NAME] // GC mem used internally by features
      delete this.sharedAggregator
      // Keep the initialized agent object with its configs for troubleshooting purposes.
      newrelic.ee?.abort() // set flag and clear global backlog
      delete newrelic.ee?.get(this.agentIdentifier) // clear this agent's own backlog too
      return false
    }
  }

  /* Below API methods are only available on a standard agent and not the micro agent */

  /**
   * Adds a JavaScript object with a custom name, start time, etc. to an in-progress session trace.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/addtotrace/}
   * @param {{name: string, start: number, end?: number, origin?: string, type?: string}} customAttributes Supply a JavaScript object with these required and optional name/value pairs:
   *
   * - Required name/value pairs: name, start
   * - Optional name/value pairs: end, origin, type
   *
   * If you are sending the same event object to New Relic as a PageAction, omit the TYPE attribute. (type is a string to describe what type of event you are marking inside of a session trace.) If included, it will override the event type and cause the PageAction event to be sent incorrectly. Instead, use the name attribute for event information.
   */
  addToTrace (customAttributes) {
    warn('Call to agent api addToTrace failed. The page action feature is not currently initialized.')
  }

  /**
   * Gives SPA routes more accurate names than default names. Monitors specific routes rather than by default grouping.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/setcurrentroutename/}
   * @param {string} name Current route name for the page.
   */
  setCurrentRouteName (name) {
    warn('Call to agent api setCurrentRouteName failed. The spa feature is not currently initialized.')
  }

  /**
   * Returns a new API object that is bound to the current SPA interaction.
   * {@link https://docs.newrelic.com/docs/browser/new-relic-browser/browser-apis/interaction/}
   * @returns {InteractionInstance} An API object that is bound to a specific BrowserInteraction event. Each time this method is called for the same BrowserInteraction, a new object is created, but it still references the same interaction.
   */
  interaction () {
    warn('Call to agent api interaction failed. The spa feature is not currently initialized.')
  }
}
