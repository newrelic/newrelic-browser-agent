import {BrowserAgent} from "@newrelic/browser-agent/src/custom-loader";

import { Instrument as InstrumentMetrics } from '@newrelic/browser-agent-core/src/features/metrics/instrument'
import { Instrument as InstrumentErrors } from '@newrelic/browser-agent-core/src/features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '@newrelic/browser-agent-core/src/features/ajax/instrument'
import { Instrument as InstrumentPageAction } from '@newrelic/browser-agent-core/src/features/page_action/instrument'

const agent = new BrowserAgent({
    topLevelConfigs: true, 
    features: [
        InstrumentMetrics,
        InstrumentErrors,
        InstrumentXhr,
        InstrumentPageAction
    ]
})