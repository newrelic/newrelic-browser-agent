import { Agent } from './agent'

import { Instrument as InstrumentPageViewEvent } from '../features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '../features/session_trace/instrument'
import { Instrument as InstrumentSpa } from '../features/spa/instrument'
import { Instrument as InstrumentSessionReplay } from '../features/session_replay/instrument'
import { Instrument as InstrumentGenericEvents } from '../features/generic_events/instrument'
import { Instrument as InstrumentLogs } from '../features/logging/instrument'
import { Instrument as InstrumentSoftNav } from '../features/soft_navigations/instrument'

/**
 * An agent class with all feature modules available. Features may be disabled and enabled via runtime configuration.
 * The BrowserAgent class is the most convenient and reliable option for most use cases.
 */
export class BrowserAgent extends Agent {
  constructor (args) {
    super({
      ...args,
      features: [
        InstrumentXhr,
        InstrumentPageViewEvent,
        InstrumentPageViewTiming,
        InstrumentSessionTrace,
        InstrumentMetrics,
        InstrumentErrors,
        InstrumentSpa,
        InstrumentSoftNav,
        InstrumentSessionReplay,
        InstrumentGenericEvents,
        InstrumentLogs
      ],
      loaderType: 'browser-agent'
    })
  }
}
