import { Agent } from './agent'

import { generateRandomHexString } from '../common/ids/unique-id'
import { Instrument as InstrumentPageViewEvent } from '../features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '../features/session_trace/instrument'
import { Instrument as InstrumentSpa } from '../features/spa/instrument'
import { Instrument as InstrumentPageAction } from '../features/page_action/instrument'

export class BrowserAgent extends Agent {
  constructor (options, agentIdentifier = generateRandomHexString(16)) {
    super({
      ...options,
      features: [
        InstrumentXhr,
        InstrumentPageViewEvent,
        InstrumentPageViewTiming,
        InstrumentSessionTrace,
        InstrumentMetrics,
        InstrumentPageAction,
        InstrumentErrors,
        InstrumentSpa
      ],
      loaderType: 'browser-agent'
    }, agentIdentifier)
  }
}
