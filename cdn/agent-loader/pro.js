import {BrowserAgent} from "@newrelic/browser-agent/src/custom-loader";

import { Instrument as InstrumentPageViewEvent } from '@newrelic/browser-agent-core/src/features/page-view-event/instrument'
import { Instrument as InstrumentPageViewTiming } from '@newrelic/browser-agent-core/src/features/page-view-timing/instrument'
import { Instrument as InstrumentMetrics } from '@newrelic/browser-agent-core/src/features/metrics/instrument'
import { Instrument as InstrumentErrors } from '@newrelic/browser-agent-core/src/features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '@newrelic/browser-agent-core/src/features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '@newrelic/browser-agent-core/src/features/session-trace/instrument'
import { Instrument as InstrumentPageAction } from '@newrelic/browser-agent-core/src/features/page-action/instrument'

const agent = new BrowserAgent({
    topLevelConfigs: true, 
    features: [
        InstrumentPageViewEvent,
        InstrumentPageViewTiming,
        InstrumentMetrics,
        InstrumentErrors,
        InstrumentXhr,
        InstrumentSessionTrace,
        InstrumentPageAction
    ]
})