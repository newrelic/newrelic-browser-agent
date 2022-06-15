import { getRuntime } from '@newrelic/browser-agent-core/common/config/config'
import { drain } from '@newrelic/browser-agent-core/common/drain/drain'
import { features } from './util/features'
import { activateFeatures, activatedFeatures } from '@newrelic/browser-agent-core/common/util/feature-flags'
import { addToNREUM } from '@newrelic/browser-agent-core/common/window/nreum'
import agentIdentifier from '../shared/agentIdentifier'
import { Aggregator } from '@newrelic/browser-agent-core/common/aggregate/aggregator'
import { initializeAPI } from './util/api'
import { getEnabledFeatures } from '@newrelic/browser-agent-core/common/util/enabled-features'

export function aggregator (build) {
    console.log("-- loaded main aggregator module -- ", build)
    const autorun = typeof (getRuntime(agentIdentifier).autorun) !== 'undefined' ? getRuntime(agentIdentifier).autorun : true

    const sharedAggregator = new Aggregator({ agentIdentifier })
    initializeAPI(agentIdentifier)
    
    // Features are activated using the legacy setToken function name via JSONP
    addToNREUM('setToken', (flags) => activateFeatures(flags, agentIdentifier))
    
    // import relevant feature aggregators
    if (autorun) initializeFeatures()
    
    async function initializeFeatures() {
      const enabledFeatures = getEnabledFeatures(agentIdentifier)
      // load all the features associated with this build type
      await Promise.all(features[build].map(async feature => {
        const { Aggregate } = await import(`@newrelic/browser-agent-core/features/${feature}/aggregate`) // AJAX -- load a small bundle specific to that feature agg
        console.log("initialize aggregator for", feature, agentIdentifier, sharedAggregator)
        if (enabledFeatures[feature.replace(/-/g, '_')]) new Aggregate(agentIdentifier, sharedAggregator)
      }))
      // once ALL the features all initialized, drain all the buffers
      drainAll()
      // add the activated features from the setToken call to the window for testing purposes
      addToNREUM('activatedFeatures', activatedFeatures)
    }
    
    function drainAll() {
      drain(agentIdentifier, 'api')
      drain(agentIdentifier, 'feature')
    }
    
}

