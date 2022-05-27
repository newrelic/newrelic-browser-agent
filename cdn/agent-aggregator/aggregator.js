import { getRuntime } from '@newrelic/browser-agent-core/common/config/config'
import { drain } from '@newrelic/browser-agent-core/common/drain/drain'
import { features } from './util/features'
import { activateFeatures, activatedFeatures } from '@newrelic/browser-agent-core/common/util/feature-flags'
import { addToNREUM } from '@newrelic/browser-agent-core/common/window/nreum'
import { recordFrameworks } from '@newrelic/browser-agent-core/common/metrics/framework-detection'
import agentIdentifier from '../shared/agentIdentifier'
import { Aggregator } from '@newrelic/browser-agent-core/common/aggregate/aggregator'

export function aggregator (build) {
    console.log("aggregator -- ", build)
    const autorun = typeof (getRuntime(agentIdentifier).autorun) !== 'undefined' ? getRuntime(agentIdentifier).autorun : true
    // this determines what features to build into the aggregator
    // this could <possibly> be optimized to run on one file via env var
    // running out of time so keeping in 3 files for now
    // const build = 'lite'
    const sharedAggregator = new Aggregator({ agentIdentifier })
    
    // Features are activated using the legacy setToken function name via JSONP
    addToNREUM('setToken', activateFeatures)
    
    // import relevant feature aggregators
    if (autorun) initializeFeatures()
    
    // collect general supportability metrics
    captureSupportabilityMetrics()
    
    async function initializeFeatures() {
      // load all the features associated with this build type
      await Promise.all(features[build].map(async feature => {
        const { Aggregate } = await import(`@newrelic/browser-agent-core/features/${feature}/aggregate`)
        console.log("initialize aggregator for", feature, agentIdentifier, sharedAggregator)
        new Aggregate(agentIdentifier, sharedAggregator)
      }))
      // once ALL the features all initialized, drain all the buffers
      drainAll()
      // add the activated features from the setToken call to the window for testing purposes
      addToNREUM('activatedFeatures', activatedFeatures)
    }
    
    function drainAll() {
      drain('api')
      drain('feature')
    }
    
    function captureSupportabilityMetrics() {
      recordFrameworks()
      // others could go here
    }
    
}

