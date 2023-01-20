// loader files
import { getEnabledFeatures } from './features/enabled-features'
import { configure } from './configure/configure'
// core files
import { Aggregator } from '../common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '../common/window/nreum'
import { generateRandomHexString } from '../common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '../common/config/config'

const nonAutoFeatures = [
    'jserrors',
    'page_action'
]

const autoFeatures = [
    'metrics'
]

export class MicroAgent {
    constructor(options, agentIdentifier = generateRandomHexString(16)) {
        this.agentIdentifier = agentIdentifier
        this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
        this.features = {}

        Object.assign(this, configure(this.agentIdentifier, { ...options, runtime: { isolatedBacklog: true } }, options.loaderType || 'micro-agent'))

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
            console.log("start", this.agentIdentifier)
            const enabledFeatures = getEnabledFeatures(this.agentIdentifier)
            autoFeatures.forEach(f => {
                if (enabledFeatures[f]) {
                    import(`../features/${f}/instrument`).then(({ Instrument }) => {
                        this.features[f] = new Instrument(this.agentIdentifier, this.sharedAggregator)
                    }).catch(err => console.warn('Failed to import ', f))
                }
            })
            nonAutoFeatures.forEach(f => {
                if (enabledFeatures[f]) {
                    import(`../features/${f}/aggregate`).then(({ Aggregate }) => {
                        this.features[f] = new Aggregate(this.agentIdentifier, this.sharedAggregator)
                    }).catch(err => console.warn('Failed to import ', f))
                }
            })
            gosNREUMInitializedAgents(this.agentIdentifier, this.features, 'features')
            return this
        } catch (err) {
            console.error(err)
            return false
        }
    }
}