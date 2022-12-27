import { getEnabledFeatures } from '@newrelic/browser-agent-core/src/common/loader/enabled-features'
import { configure } from '@newrelic/browser-agent-core/src/common/loader/configure'
import { Aggregator } from '@newrelic/browser-agent-core/src/common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '@newrelic/browser-agent-core/src/common/window/nreum'
import { generateRandomHexString } from '@newrelic/browser-agent-core/src/common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '@newrelic/browser-agent-core/src/common/config/config'
import { drain } from '@newrelic/browser-agent-core/src/common/drain/drain'
import { getFeatureDependencyNames } from '@newrelic/browser-agent-core/src/common/loader/featureDependencies'

export class BrowserAgent {
    constructor(options, agentIdentifier = generateRandomHexString(16)) {
        console.log(`%c initialize BrowserAgent class`, 'color:#ffa500')
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
                if (enabledFeatures[f.featureName]) {

                    console.log(`%c initializing instrumentation file - ${f.featureName}`, 'color:#ffff00')
                    const dependencies = getFeatureDependencyNames(f.featureName)
                    const hasAllDeps = dependencies.every(x => enabledFeatures[x])

                    console.log(f.featureName, "dependencies...", dependencies)
                    console.log("hasAllDeps", hasAllDeps)

                    if (!hasAllDeps) console.warn(`New Relic: ${f.featureName} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)

                    this.features[f.featureName] = new f(this.agentIdentifier, this.sharedAggregator)
                    completed.push(this.features[f.featureName].completed)

                }
            })
            console.log(`%c wait for ${completed.length} feature promises to finish before draining...`, 'color:#ffa500')
            Promise.all(completed).then(() => {
                console.log("%c all promises complete, drainAll!", 'color:#ffa500')
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