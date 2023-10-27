// important side effects
import './configure/public-path'
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
      info: this.info,
      init: this.init,
      loader_config: this.loader_config,
      runtime: this.runtime
    }
  }

  run () {
    // Attempt to initialize all the requested features (sequentially in prio order & synchronously), with any failure aborting the whole process.
    try {
      const enabledFeatures = getEnabledFeatures(this.agentIdentifier)
      const featuresToStart = [...this.desiredFeatures]
      const shouldRunSoftNavOverSpa = Boolean(featuresToStart.some(instr => instr.featureName === FEATURE_NAMES.softNav) &&
        enabledFeatures[FEATURE_NAMES.softNav] && this.init.feature_flags.includes('soft_nav')) // if soft_navigations is allowed to run AND part of this agent build, so that we don't erroneously skip old spa

      featuresToStart.sort((a, b) => featurePriority[a.featureName] - featurePriority[b.featureName])
      featuresToStart.forEach(InstrumentCtor => {
        if (!enabledFeatures[InstrumentCtor.featureName] && InstrumentCtor.featureName !== FEATURE_NAMES.pageViewEvent) return // PVE is required to run even if it's marked disabled
        if (shouldRunSoftNavOverSpa && InstrumentCtor.featName === FEATURE_NAMES.spa) return // only meaningful if BOTH soft-nav & old spa features are included in agent build, in which this would ignore old spa

        const dependencies = getFeatureDependencyNames(InstrumentCtor.featureName)
        const hasAllDeps = dependencies.every(featName => featName in this.features) // any other feature(s) this depends on should've been initialized on prior iterations by priority order
        if (!hasAllDeps) warn(`${InstrumentCtor.featureName} is enabled but one or more dependent features has not been initialized (${stringify(dependencies)}). This may cause unintended consequences or missing data...`)

        this.features[InstrumentCtor.featureName] = new InstrumentCtor(this.agentIdentifier, this.sharedAggregator)
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
    warn('Call to agent api addToTrace failed. The session trace feature is not currently initialized.')
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
