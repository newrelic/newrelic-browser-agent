/**
 * @file Creates a "Worker" agent loader bundle composed of the core Agent and the subset of feature modules applicable
 * in a service worker context.
 */

import { Agent } from '../loaders/agent'

import { Instrument as InstrumentMetrics } from '../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../features/ajax/instrument'
import { Instrument as InstrumentPageAction } from '../features/page_action/instrument'

new Agent({
  features: [
    InstrumentMetrics,
    InstrumentErrors,
    InstrumentXhr,
    InstrumentPageAction
  ],
  loaderType: 'worker'
})
