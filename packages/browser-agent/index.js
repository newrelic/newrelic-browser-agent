// loader files
import { getEnabledFeatures, isAuto } from '@newrelic/browser-agent-loader-utils/src/enabled-features'
import { syncFeatures, asyncFeatures } from '@newrelic/browser-agent-loader-utils/src/features'
import { getFeatureDependencyNames } from '@newrelic/browser-agent-loader-utils/src/featureDependencies'
// core files
import { configure } from '@newrelic/browser-agent-loader-utils/src/configure'
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
        console.log(`%c initialize BrowserAgent class`, 'color:#ffa500')
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
            const deferred = []
            const deferredCompleted = []
            const allFeatures = [...syncFeatures, ...asyncFeatures]
            allFeatures.forEach(f => {
                if (enabledFeatures[f]) {
                    const dependencies = getFeatureDependencyNames(f.replace(/_/g, '-'))
                    const hasAllDeps = dependencies.every(x => enabledFeatures[x.replace(/-/g, '_')])

                    if (!hasAllDeps) console.warn(`New Relic: ${f} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)

                    if (isAuto(f, this.agentIdentifier)) {
                        console.log(`%c initializing pre-loaded instrumentation file - ${f}`, 'color:#ffff00')
                        this.features[f] = new instruments[f](this.agentIdentifier, this.sharedAggregator)
                        completed.push(this.features[f].completed)
                    } else if (asyncFeatures.includes(f)) {
                        console.log(`%c lazy-loading instrumentation file - ${f}`, 'color:#ffff00')
                        completed.push(import(`@newrelic/browser-agent-core/src/features/${f}/instrument`).then(({ Instrument }) => {
                            this.features[f] = new Instrument(this.agentIdentifier, this.sharedAggregator)
                            deferredCompleted.push(this.features[f].completed)
                        }))
                    } else {
                        console.log(`%c lazy-loading aggregator file - ${f}`, 'color:#00ff00')
                        completed.push(import(`@newrelic/browser-agent-core/src/features/${f}/aggregate`).then(({ Aggregate }) => {
                            this.features[f] = new Aggregate(this.agentIdentifier, this.sharedAggregator)
                        }))
                    }
                } else {
                    console.log(f, 'is disabled... do not start')
                }
            })
            Promise.all([...completed, ...deferred]).then(() => {
                console.log("all promises complete, drainAll!")
                Promise.all(deferredCompleted).then(() => {
                    drainAll(this.agentIdentifier)
                    gosNREUMInitializedAgents(this.agentIdentifier, this.features, 'features')
                })
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