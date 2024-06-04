/**
 * @file Creates a version of the "PRO" agent loader with [core-js]{@link https://github.com/zloirock/core-js}
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
import { Instrument as InstrumentPageAction } from '../../features/page_action/instrument'
import { Instrument as InstrumentLogs } from '../../features/logging/instrument'

new Agent({
  features: [
    InstrumentPageViewEvent,
    InstrumentPageViewTiming,
    InstrumentSessionTrace,
    InstrumentXhr,
    InstrumentMetrics,
    InstrumentPageAction,
    InstrumentErrors,
    InstrumentLogs
  ],
  loaderType: 'pro-polyfills'
})
