/**
 * @file Creates a version of the "SPA" agent loader with [core-js]{@link https://github.com/zloirock/core-js}
 * polyfills for pre-ES6 browsers and IE 11.
 */

import '../polyfills.js'
import { Agent } from '../../loaders/agent'

import { Instrument as InstrumentPageViewEvent } from '../../features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../../features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../../features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '../../features/session_trace/instrument'
import { Instrument as InstrumentSpa } from '../../features/spa/instrument'
import { Instrument as InstrumentGenericEvents } from '../../features/generic_events/instrument'
import { Instrument as InstrumentLogs } from '../../features/logging/instrument'

new Agent({
  features: [
    InstrumentXhr,
    InstrumentPageViewEvent,
    InstrumentPageViewTiming,
    InstrumentSessionTrace,
    InstrumentMetrics,
    InstrumentErrors,
    InstrumentGenericEvents,
    InstrumentLogs,
    InstrumentSpa
  ],
  loaderType: 'spa-polyfills'
})
