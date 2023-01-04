import {BrowserAgent} from "@newrelic/browser-agent-custom/src";

import { Instrument as InstrumentPageViewEvent } from '@newrelic/browser-agent-core/src/features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '@newrelic/browser-agent-core/src/features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '@newrelic/browser-agent-core/src/features/metrics/instrument'
import { Instrument as InstrumentErrors } from '@newrelic/browser-agent-core/src/features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '@newrelic/browser-agent-core/src/features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '@newrelic/browser-agent-core/src/features/session_trace/instrument'
import { Instrument as InstrumentPageAction } from '@newrelic/browser-agent-core/src/features/page_action/instrument'

new BrowserAgent({
    features: [
        InstrumentPageViewEvent,
        InstrumentPageViewTiming,
        InstrumentSessionTrace,
        InstrumentXhr,
        InstrumentMetrics,
        InstrumentPageAction,
        InstrumentErrors
    ]
})