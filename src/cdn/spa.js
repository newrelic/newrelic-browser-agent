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
import { Instrument as InstrumentSoftNav } from '../features/soft_navigations/instrument'
import { Instrument as InstrumentSpa } from '../features/spa/instrument'
import { Instrument as InstrumentGenericEvents } from '../features/generic_events/instrument'
import { Instrument as InstrumentLogs } from '../features/logging/instrument'

new Agent({
  features: [
    InstrumentXhr,
    InstrumentPageViewEvent,
    InstrumentPageViewTiming,
    InstrumentSessionTrace,
    InstrumentSessionReplay,
    InstrumentMetrics,
    InstrumentErrors,
    InstrumentGenericEvents,
    InstrumentLogs,
    InstrumentSoftNav,
    InstrumentSpa // either the softnav or the old spa will be used (not both), but we still need to pack both to avoid dynamic import for instrument files
  ],
  loaderType: 'spa'
})
