import { Agent } from "../loaders/agent";

import { Instrument as InstrumentPageViewEvent } from '../features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../features/metrics/instrument'

new Agent({
    features: [
        InstrumentPageViewEvent,
        InstrumentPageViewTiming,
        InstrumentMetrics
    ], loaderType: 'lite'
})
