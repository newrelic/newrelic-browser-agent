/**
 * @file Creates a "SPA" agent loader bundle composed of the core agent and all available feature modules.
 */

import { Agent } from '../loaders/agent'

import { Instrument as InstrumentPageViewEvent } from '../features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '../features/session_trace/instrument'
import { Instrument as InstrumentSessionReplay } from '../features/session_replay/instrument'
import { Instrument as InstrumentSpa } from '../features/spa/instrument'
import { Instrument as InstrumentPageAction } from '../features/page_action/instrument'
import { Instrument as InstrumentMarksAndMeasures } from '../features/marks_and_measures/instrument'

new Agent({
  features: [
    InstrumentXhr,
    InstrumentPageViewEvent,
    InstrumentPageViewTiming,
    InstrumentSessionTrace,
    InstrumentSessionReplay,
    InstrumentMetrics,
    InstrumentPageAction,
    InstrumentErrors,
    InstrumentSpa,
    InstrumentMarksAndMeasures
  ],
  loaderType: 'spa'
})
