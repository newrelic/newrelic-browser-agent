// loader files
import { getEnabledFeatures, isAuto } from '@newrelic/browser-agent-core/src/loader/features/enabled-features'
import { syncFeatures, asyncFeatures, featurePriority } from '@newrelic/browser-agent-core/src/loader/features/features'
import { getFeatureDependencyNames } from '@newrelic/browser-agent-core/src/loader/features/featureDependencies'
// core files
import { configure } from '@newrelic/browser-agent-core/src/loader/configure/configure'
import { Aggregator } from '@newrelic/browser-agent-core/src/common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '@newrelic/browser-agent-core/src/common/window/nreum'
import { generateRandomHexString } from '@newrelic/browser-agent-core/src/common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '@newrelic/browser-agent-core/src/common/config/config'
import { drain } from '@newrelic/browser-agent-core/src/common/drain/drain'

import { Instrument as InstrumentPageViewEvent } from '@newrelic/browser-agent-core/src/features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '@newrelic/browser-agent-core/src/features/page_view_timing/instrument'
import { Instrument as InstrumentErrors } from '@newrelic/browser-agent-core/src/features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '@newrelic/browser-agent-core/src/features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '@newrelic/browser-agent-core/src/features/session_trace/instrument'
import { Instrument as InstrumentSpa } from '@newrelic/browser-agent-core/src/features/spa/instrument'

const instruments = {
    ajax: InstrumentXhr,
    jserrors: InstrumentErrors,
    page_view_event: InstrumentPageViewEvent,
    page_view_timing: InstrumentPageViewTiming,
    session_trace: InstrumentSessionTrace,
    spa: InstrumentSpa
}

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
            const allFeatures = [...syncFeatures, ...asyncFeatures]
            allFeatures.sort((a, b) => featurePriority[a.featureName] - featurePriority[b.featureName])
            allFeatures.forEach(f => {
                if (enabledFeatures[f]) {
                    const dependencies = getFeatureDependencyNames(f.replace(/_/g, '-'))
                    const hasAllDeps = dependencies.every(x => enabledFeatures[x.replace(/-/g, '_')])

                    if (!hasAllDeps) console.warn(`New Relic: ${f} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)

                    if (isAuto(f, this.agentIdentifier)) {
                        this.features[f] = new instruments[f](this.agentIdentifier, this.sharedAggregator)
                    } else if (asyncFeatures.includes(f)) {
                        import(`@newrelic/browser-agent-core/src/features/${f}/instrument`).then(({ Instrument }) => {
                            this.features[f] = new Instrument(this.agentIdentifier, this.sharedAggregator)
                        }).catch(err => console.warn('Failed to import ', f))
                    } else {
                        import(`@newrelic/browser-agent-core/src/features/${f}/aggregate`).then(({ Aggregate }) => {
                            this.features[f] = new Aggregate(this.agentIdentifier, this.sharedAggregator)
                        }).catch(err => console.warn('Failed to import ', f))
                    }
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
