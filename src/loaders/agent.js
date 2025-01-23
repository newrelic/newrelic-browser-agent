/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { gosNREUM, setNREUMInitializedAgent } from '../common/window/nreum'
import { warn } from '../common/util/console'
import { globalScope } from '../common/constants/runtime'

/**
 * A flexible class that may be used to compose an agent from a select subset of feature modules. In applications
 * sensitive to network load, this may result in smaller builds with slightly lower performance impact.
 */
export class Agent extends AgentBase {
  /**
   * @param {Object} options Options to initialize agent with
   * @param {string} [agentIdentifier] Optional identifier of agent
   */
  constructor (options, agentIdentifier) {
    super(agentIdentifier)

    if (!globalScope) {
      // We could not determine the runtime environment. Short-circuite the agent here
      // to avoid possible exceptions later that may cause issues with customer's application.
      warn(21)
      return
    }

    this.features = {}
    setNREUMInitializedAgent(this.agentIdentifier, this) // append this agent onto the global NREUM.initializedAgents

    this.desiredFeatures = new Set(options.features || []) // expected to be a list of static Instrument/InstrumentBase classes, see "spa.js" for example
    // For Now... ALL agents must make the rum call whether the page_view_event feature was enabled or not.
    // NR1 creates an index on the rum call, and if not seen for a few days, will remove the browser app!
    // Future work is being planned to evaluate removing this behavior from the backend, but for now we must ensure this call is made
    this.desiredFeatures.add(PageViewEvent)

    this.runSoftNavOverSpa = [...this.desiredFeatures].some(instr => instr.featureName === FEATURE_NAMES.softNav)
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

      featuresToStart.sort((a, b) => featurePriority[a.featureName] - featurePriority[b.featureName])
      featuresToStart.forEach(InstrumentCtor => {
        if (!enabledFeatures[InstrumentCtor.featureName] && InstrumentCtor.featureName !== FEATURE_NAMES.pageViewEvent) return // PVE is required to run even if it's marked disabled
        if (this.runSoftNavOverSpa && InstrumentCtor.featureName === FEATURE_NAMES.spa) return
        if (!this.runSoftNavOverSpa && InstrumentCtor.featureName === FEATURE_NAMES.softNav) return

        const dependencies = getFeatureDependencyNames(InstrumentCtor.featureName)
        const missingDependencies = dependencies.filter(featName => !(featName in this.features)) // any other feature(s) this depends on should've been initialized on prior iterations by priority order
        if (missingDependencies.length > 0) {
          warn(36, {
            targetFeature: InstrumentCtor.featureName,
            missingDependencies
          })
        }

        this.features[InstrumentCtor.featureName] = new InstrumentCtor(this)
      })
    } catch (err) {
      warn(22, err)
      for (const featName in this.features) { // this.features hold only features that have been instantiated
        this.features[featName].abortHandler?.()
      }

      const newrelic = gosNREUM()
      delete newrelic.initializedAgents[this.agentIdentifier]?.api // prevent further calls to agent-specific APIs (see "configure.js")
      delete newrelic.initializedAgents[this.agentIdentifier]?.features // GC mem used internally by features
      delete this.sharedAggregator
      // Keep the initialized agent object with its configs for troubleshooting purposes.
      const thisEE = newrelic.ee.get(this.agentIdentifier)
      thisEE.abort() // set flag and clear backlog
      return false
    }
  }
}
