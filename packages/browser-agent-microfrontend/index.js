// loader files
import { getEnabledFeatures } from '@newrelic/browser-agent-core/src/loader/enabled-features'
import { configure } from '@newrelic/browser-agent-core/src/loader/configure'
// core files
import { Aggregator } from '@newrelic/browser-agent-core/src/common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '@newrelic/browser-agent-core/src/common/window/nreum'
import { generateRandomHexString } from '@newrelic/browser-agent-core/src/common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '@newrelic/browser-agent-core/src/common/config/config'
import { drain } from '@newrelic/browser-agent-core/src/common/drain/drain'

const nonAutoFeatures = [
    'jserrors',
    'page_action'
]

const autoFeatures = [
    'metrics'
]

export class BrowserAgent {
    constructor(options, agentIdentifier = generateRandomHexString(16)) {
        this.agentIdentifier = agentIdentifier
        this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
        this.features = {}

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
            autoFeatures.forEach(f => {
                if (enabledFeatures[f]) {
                    this.features[f] = null
                    completed.push(import(`@newrelic/browser-agent-core/src/features/${f}/instrument`))
                }
            })
            nonAutoFeatures.forEach(f => {
                if (enabledFeatures[f]) {
                    this.features[f] = null
                    completed.push(import(`@newrelic/browser-agent-core/src/features/${f}/aggregate`))
                }
            })
            Promise.all(completed).then((imports) => {
                const chainedCompleted = []
                imports.forEach(({ Instrument, Aggregate }, i) => {
                    const key = Object.keys(this.features)[i]
                    this.features[key] = new (Instrument || Aggregate)(this.agentIdentifier, this.sharedAggregator)
                    if (Instrument) chainedCompleted.push(this.features[key].completed)
                })
                Promise.all(chainedCompleted).then(() => {
                    drain(this.agentIdentifier, 'api')
                    gosNREUMInitializedAgents(this.agentIdentifier, this.features, 'features')
                })
            })

            return this
        } catch (err) {
            console.error(err)
            return false
        }
    }
}