import { getEnabledFeatures, isAuto } from '@newrelic/browser-agent-core/src/common/loader/enabled-features'
import { configure } from '@newrelic/browser-agent-core/src/common/loader/configure'
import { Aggregator } from '@newrelic/browser-agent-core/src/common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '@newrelic/browser-agent-core/src/common/window/nreum'
import { generateRandomHexString } from '@newrelic/browser-agent-core/src/common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '@newrelic/browser-agent-core/src/common/config/config'
import { drain } from '@newrelic/browser-agent-core/src/common/drain/drain'
import { getFeatureDependencyNames } from '@newrelic/browser-agent-core/src/common/loader/featureDependencies'

export class BrowserAgent {
    constructor(options, agentIdentifier = generateRandomHexString(16)) {
        this.agentIdentifier = agentIdentifier
        this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
        this.features = {}

        this.desiredFeatures = options.features || []

        Object.assign(this, configure(this.agentIdentifier, options))

        this.start()
    }

    get config() {
        return {
            info: getInfo(this.agentIdentifier),
            init: getConfiguration(this.agentIdentifier),
            loader_config: getLoaderConfig(this.agentIdentifier),
            runtime: getRuntime(this.agentIdentifier)
        }
    }

    start() {
        try {
            const enabledFeatures = getEnabledFeatures(this.agentIdentifier)
            const completed = []
            this.desiredFeatures.forEach(f => {
                console.log(f.featureName)
                console.log(f)
                if (enabledFeatures[f.featureName.replace(/-/g, '_')]) {
                    const dependencies = getFeatureDependencyNames(f.featureName.replace(/_/g, '-'))
                    const hasAllDeps = dependencies.every(x => enabledFeatures[x.replace(/-/g, '_')])

                    if (!hasAllDeps) console.warn(`New Relic: ${f} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)
                    
                    this.features[f.featureName] = new f(this.agentIdentifier, this.sharedAggregator)
                    completed.push(this.features[f.featureName].completed)

                }
            })
            console.log(completed)
            Promise.all(completed).then(() => {
                console.log("all promises complete, drainAll!")
                drainAll(this.agentIdentifier)
                gosNREUMInitializedAgents(this.agentIdentifier, this.features, 'features')
            })
            return this
        } catch (err) {
            console.trace()
            console.error(err)
            return false
        }
    }
}

function drainAll(agentIdentifier) {
    drain(agentIdentifier, 'api')
    drain(agentIdentifier, 'feature')
}