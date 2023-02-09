import { Agent } from './agent'

import { Instrument as InstrumentMetrics } from '../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../features/ajax/instrument'
import { Instrument as InstrumentPageAction } from '../features/page_action/instrument'

export class WorkerAgent extends Agent {
  constructor (...args) {
    super({
      ...args,
      features: [
        InstrumentMetrics,
        InstrumentErrors,
        InstrumentXhr,
        InstrumentPageAction
      ],
      loaderType: 'worker-agent'
    })
  }
}
