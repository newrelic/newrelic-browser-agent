// loader files
import { getEnabledFeatures } from './features/enabled-features'
import { configure } from './configure/configure'
import { getFeatureDependencyNames } from './features/featureDependencies'
import { featurePriority } from './features/features'
// common files
import { Aggregator } from '../common/aggregate/aggregator'
import { gosNREUM, gosNREUMInitializedAgents } from '../common/window/nreum'
import { generateRandomHexString } from '../common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '../common/config/config'
import { warn } from '../common/util/console'


export class Agent {
    constructor(options, agentIdentifier = generateRandomHexString(16)) {
        this.agentIdentifier = agentIdentifier
        this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
        this.features = {}

        this.desiredFeatures = options.features || [];  // expected to be a list of static Instrument/InstrumentBase classes, see "spa.js" for example
        this.desiredFeatures.sort((a, b) => featurePriority[a.featureName] - featurePriority[b.featureName])

        Object.assign(this, configure(this.agentIdentifier, options, options.loaderType || 'agent'))

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
        const NR_FEATURES_REF_NAME = "features";
        // Attempt to initialize all the requested features (sequentially in prio order & synchronously), with any failure aborting the whole process.
        try {
            const enabledFeatures = getEnabledFeatures(this.agentIdentifier)
            this.desiredFeatures.forEach(f => {
                if (enabledFeatures[f.featureName]) {
                    const dependencies = getFeatureDependencyNames(f.featureName)
                    const hasAllDeps = dependencies.every(x => enabledFeatures[x])
                    if (!hasAllDeps) warn(`${f.featureName} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)
                    this.features[f.featureName] = new f(this.agentIdentifier, this.sharedAggregator)
                }
            })
            gosNREUMInitializedAgents(this.agentIdentifier, this.features, NR_FEATURES_REF_NAME);
        } catch (err) {
            warn(`Failed to initialize all enabled instrument classes (agent aborted) -`, err)
            for (const featName in this.features) { // this.features hold only features that have been instantiated
                this.features[featName].abortHandler?.();
            }

            const newrelic = gosNREUM();
            delete newrelic.initializedAgents[this.agentIdentifier]?.['api'];   // prevent further calls to agent-specific APIs (see "configure.js")
            delete newrelic.initializedAgents[this.agentIdentifier]?.[NR_FEATURES_REF_NAME];    // GC mem used internally by features
            delete this.sharedAggregator;
            // Keep the initialized agent object with its configs for troubleshooting purposes.
            delete newrelic.ee?.get(this.agentIdentifier);  // clear our events storage
            return false
        }
    }
}