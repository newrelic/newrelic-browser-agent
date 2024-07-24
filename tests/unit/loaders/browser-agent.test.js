import { faker } from '@faker-js/faker'
import { BrowserAgent } from '../../../src/loaders/browser-agent'
import { Instrument as InstrumentPageViewEvent } from '../../../src/features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../../../src/features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../../../src/features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../../../src/features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../../../src/features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '../../../src/features/session_trace/instrument'
import { Instrument as InstrumentSpa } from '../../../src/features/spa/instrument'
import { Instrument as InstrumentSessionReplay } from '../../../src/features/session_replay/instrument'
import { Instrument as InstrumentGenericEvents } from '../../../src/features/generic_events/instrument'
import { Instrument as InstrumentLogs } from '../../../src/features/logging/instrument'
import * as agentModule from '../../../src/loaders/agent'

jest.enableAutomock()
jest.unmock('../../../src/loaders/browser-agent')

test('should create a new agent with all features', () => {
  new BrowserAgent()

  expect(agentModule.Agent).toHaveBeenLastCalledWith(expect.objectContaining({
    features: [
      InstrumentXhr,
      InstrumentPageViewEvent,
      InstrumentPageViewTiming,
      InstrumentSessionTrace,
      InstrumentMetrics,
      InstrumentErrors,
      InstrumentSpa,
      InstrumentSessionReplay,
      InstrumentGenericEvents,
      InstrumentLogs
    ]
  }))
})

test('should set loader type property', () => {
  new BrowserAgent()

  expect(agentModule.Agent).toHaveBeenLastCalledWith(expect.objectContaining({
    loaderType: 'browser-agent'
  }))
})

test('should pass constructor options to agent class', () => {
  const opts = {
    [faker.string.uuid()]: faker.string.uuid()
  }

  new BrowserAgent(opts)

  expect(agentModule.Agent).toHaveBeenLastCalledWith(expect.objectContaining(opts))
})
