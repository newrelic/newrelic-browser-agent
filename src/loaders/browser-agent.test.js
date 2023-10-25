import { faker } from '@faker-js/faker'
import { BrowserAgent } from './browser-agent'
import { Instrument as InstrumentPageViewEvent } from '../features/page_view_event/instrument'
import { Instrument as InstrumentPageViewTiming } from '../features/page_view_timing/instrument'
import { Instrument as InstrumentMetrics } from '../features/metrics/instrument'
import { Instrument as InstrumentErrors } from '../features/jserrors/instrument'
import { Instrument as InstrumentXhr } from '../features/ajax/instrument'
import { Instrument as InstrumentSessionTrace } from '../features/session_trace/instrument'
import { Instrument as InstrumentSpa } from '../features/spa/instrument'
import { Instrument as InstrumentPageAction } from '../features/page_action/instrument'
import { Instrument as InstrumentSessionReplay } from '../features/session_replay/instrument'
import * as agentModule from './agent'

jest.enableAutomock()
jest.unmock('./browser-agent')

test('should create a new agent with all features', () => {
  new BrowserAgent()

  expect(agentModule.Agent).toHaveBeenLastCalledWith(expect.objectContaining({
    features: [
      InstrumentXhr,
      InstrumentPageViewEvent,
      InstrumentPageViewTiming,
      InstrumentSessionTrace,
      InstrumentMetrics,
      InstrumentPageAction,
      InstrumentErrors,
      InstrumentSpa,
      InstrumentSessionReplay
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
    [faker.datatype.uuid()]: faker.datatype.uuid()
  }

  new BrowserAgent(opts)

  expect(agentModule.Agent).toHaveBeenLastCalledWith(expect.objectContaining(opts))
})
