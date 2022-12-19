import { featureNames, getEnabledFeatures, isAuto } from '@newrelic/browser-agent-core/src/common/loader/enabled-features'
import { configure } from '@newrelic/browser-agent-core/src/common/loader/configure'
import { Aggregator } from '@newrelic/browser-agent-core/src/common/aggregate/aggregator'
import { gosNREUMInitializedAgents } from '@newrelic/browser-agent-core/src/common/window/nreum'
import { generateRandomHexString } from '@newrelic/browser-agent-core/src/common/ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '@newrelic/browser-agent-core/src/common/config/config'
import { drain } from '@newrelic/browser-agent-core/src/common/drain/drain'
import { getFeatureDependencyNames } from '@newrelic/browser-agent-core/src/common/loader/featureDependencies'

import { Instrument as InstrumentPageViewEvent } from '@newrelic/browser-agent-core/src/features/page-view-event/instrument'
import { Instrument as InstrumentPageViewTiming } from '@newrelic/browser-agent-core/src/features/page-view-timing/instrument'
import { Instrument as InstrumentMetrics } from '@newrelic/browser-agent-core/src/features/metrics/instrument'
import { Instrument as InstrumentErrors } from '@newrelic/browser-agent-core/src/features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '@newrelic/browser-agent-core/src/features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '@newrelic/browser-agent-core/src/features/session-trace/instrument'
import { Instrument as InstrumentSpa } from '@newrelic/browser-agent-core/src/features/spa/instrument'

const instruments = {
    ajax: InstrumentXhr,
    jserrors: InstrumentErrors,
    metrics: InstrumentMetrics,
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
            const completed = []
            featureNames.forEach(f => {
                if (enabledFeatures[f]) {
                    const dependencies = getFeatureDependencyNames(f.replace(/_/g, '-'))
                    const hasAllDeps = dependencies.every(x => enabledFeatures[x.replace(/-/g, '_')])

                    if (!hasAllDeps) console.warn(`New Relic: ${f} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)

                    if (isAuto(f, this.agentIdentifier)) {
                        this.features[f] = new instruments[f](this.agentIdentifier, this.sharedAggregator)
                        completed.push(this.features[f].completed)
                    } else {
                        console.log("skip to aggregator for ", f)
                        completed.push(import(`@newrelic/browser-agent-core/src/features/${f.replace(/_/g, '-')}/aggregate`).then(({ Aggregate }) => {
                            this.features[f] = new Aggregate(this.agentIdentifier, this.sharedAggregator)
                        }))
                    }
                } else {
                    console.log(f, 'is disabled... do not start')
                }
            })
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