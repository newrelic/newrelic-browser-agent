import { featureNames, getEnabledFeatures, isAuto } from '../util/enabled-features'
import { configure } from './configure'
import { Aggregator } from '../aggregate/aggregator'
import { gosCDN, gosNREUMInitializedAgents } from '../window/nreum'
import { generateRandomHexString } from '../ids/unique-id'
import { getConfiguration, getInfo, getLoaderConfig, getRuntime } from '../config/config'
import { drain } from '../drain/drain'
import { getFeatureDependencyNames } from './featureDependencies'

import { Instrument as InstrumentPageViewEvent } from '../../features/page-view-event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../../features/page-view-timing/instrument'
import { Instrument as InstrumentMetrics } from '../../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../../features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '../../features/session-trace/instrument'
import { Instrument as InstrumentSpa } from '../../features/spa/instrument'

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
    constructor(agentIdentifier = generateRandomHexString(16)) {
        this.agentIdentifier = agentIdentifier
        this.sharedAggregator = new Aggregator({ agentIdentifier: this.agentIdentifier })
        this.features = {}

        const nr = gosCDN()
        if (!nr.BrowserAgent) nr.BrowserAgent = BrowserAgent
    }

    get config() {
        return {
            info: getInfo(this.agentIdentifier),
            init: getConfiguration(this.agentIdentifier),
            loader_config: getLoaderConfig(this.agentIdentifier),
            runtime: getRuntime(this.agentIdentifier)
        }
    }

    async start(options) {
        try {
            Object.assign(this, configure(this.agentIdentifier, options))
            const enabledFeatures = getEnabledFeatures(this.agentIdentifier)
            const completed = []
            featureNames.forEach(async f => {
                if (enabledFeatures[f]) {
                    const dependencies = getFeatureDependencyNames(f.replace(/_/g, '-'))
                    const hasAllDeps = dependencies.every(x => enabledFeatures[x.replace(/-/g, '_')])
                    
                    if (!hasAllDeps) console.warn(`New Relic: ${f} is enabled but one or more dependent features has been disabled (${JSON.stringify(dependencies)}). This may cause unintended consequences or missing data...`)

                    if (isAuto(f, this.agentIdentifier)) {
                        this.features[f] = new instruments[f](this.agentIdentifier, this.sharedAggregator)
                        completed.push(this.features[f].completed)
                    } else {
                        console.log("skip to aggregator for ", f)
                        const { Aggregate } = await import(`../../features/${f.replace(/_/g, '-')}/aggregate`)
                        this.features[f] = new Aggregate(this.agentIdentifier, this.sharedAggregator)
                    }
                }
            })
            await Promise.all(completed)
            console.log("all promises complete, drainAll!")
            drainAll(this.agentIdentifier)
            gosNREUMInitializedAgents(this.agentIdentifier, this.features, 'features')
            return true
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