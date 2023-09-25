/**
 * @file Creates a version of the "Lite" agent loader with [core-js]{@link https://github.com/zloirock/core-js}
 * polyfills for pre-ES6 browsers and IE 11.
 */

import '../polyfills.js'
import { Agent } from '../../loaders/agent'

import { Instrument as InstrumentPageViewEvent } from '../../features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../../features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../../features/metrics/instrument'

new Agent({
  features: [
    InstrumentPageViewEvent,
    InstrumentPageViewTiming,
    InstrumentMetrics
  ],
  loaderType: 'lite-polyfills'
})
