// loader files
import { getEnabledFeatures } from '@newrelic/browser-agent-core/src/loader/enabled-features'
import { configure } from '@newrelic/browser-agent-core/src/loader/configure'
import { getFeatureDependencyNames } from '@newrelic/browser-agent-core/src/loader/featureDependencies'
import { featurePriority } from '@newrelic/browser-agent-core/src/loader/features'
// common files
import { Aggregator } from '@newrelic/browser-agent-core/src/common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '@newrelic/browser-agent-core/src/common/window/nreum'
import { generateRandomHexString } from '@newrelic/browser-agent-core/src/common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '@newrelic/browser-agent-core/src/common/config/config'


export class BrowserAgent {
    constructor(options, agentIdentifier = generateRandomHexString(16)) {
        this.agentIdentifier = agentIdentifier
        this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
        this.features = {}

        this.desiredFeatures = options.features || []
        this.desiredFeatures.sort((a, b) => featurePriority[a.featureName] - featurePriority[b.featureName])

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
            this.desiredFeatures.forEach(f => {
                if (enabledFeatures[f.featureName]) {
                    const dependencies = getFeatureDependencyNames(f.featureName)
                    const hasAllDeps = dependencies.every(x => enabledFeatures[x])

                    if (!hasAllDeps) console.warn(`New Relic: ${f.featureName} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)

                    this.features[f.featureName] = new f(this.agentIdentifier, this.sharedAggregator)
                }
            })
            gosNREUMInitializedAgents(this.agentIdentifier, this.features, 'features')
            return this
        } catch (err) {
            console.trace()
            console.error(err)
            return false
        }
    }
}