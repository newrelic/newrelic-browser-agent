import { Instrument as SpaInstrument } from './index'
import { Aggregator } from '../../../common/aggregate/aggregator'
import { getConfigurationValue, originals } from '../../../common/config/config'

jest.mock('../../../common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: true,
  globalScope: global
}))
jest.mock('../../../common/window/load', () => ({
  __esModule: true,
  onWindowLoad: jest.fn(cb => { importAggregatorFn = cb })
}))
jest.mock('../../../common/config/config', () => ({
  __esModule: true,
  originals: {
    MO: true
  },
  getConfigurationValue: jest.fn()
}))
jest.mock('../aggregate', () => ({
  __esModule: true,
  Aggregate: jest.fn()
}))
jest.mock('../../utils/agent-session', () => ({
  __esModule: true,
  setupAgentSession: jest.fn().mockReturnValue({
    isNew: true
  })
}))

let importAggregatorFn
const agentIdentifier = 'abc'

beforeEach(() => {
  jest.resetModules()
})

test('Without session and preload flag, replay queues agg import', () => {
  new SpaInstrument(agentIdentifier, new Aggregator({}))
  expect(typeof importAggregatorFn).toEqual('function')
})

describe('Replay', () => { // this is moreso a test of the SR-specific logic within importAggregator() of instrument-base.js
  test('does import with all pre-req settings on', async () => {
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload') // not testing preload behavior yet
    const spa = new SpaInstrument(agentIdentifier, new Aggregator({}))
    importAggregatorFn()
    const loaded = await spa.onAggregateImported
    expect(loaded).toEqual(true)
  })

  test('does not import if MutationObserver is missing', async () => {
    originals.MO = undefined
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload')
    const spa = new SpaInstrument(agentIdentifier, new Aggregator({}))
    importAggregatorFn()
    const loaded = await spa.onAggregateImported
    expect(loaded).toEqual(false)

    originals.MO = true // restore this for other test use
  })

  test('does not import if cookies_enabled is false', async () => {
    // localStorage.setItem('NRBA_SESSION', JSON.stringify({ hi: 'bye' }))
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload' && setting !== 'privacy.cookies_enabled')
    const spa = new SpaInstrument(agentIdentifier, new Aggregator({}))
    importAggregatorFn()
    const loaded = await spa.onAggregateImported
    expect(loaded).toEqual(false)
  })

  test('does not import if session_trace is disabled', async () => {
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload' && setting !== 'session_trace.enabled')
    const spa = new SpaInstrument(agentIdentifier, new Aggregator({}))
    importAggregatorFn()
    const loaded = await spa.onAggregateImported
    expect(loaded).toEqual(false)
  })

  test('does not import if session does not exist or failed to init', async () => {
    jest.doMock('../../utils/agent-session', () => ({
      __esModule: true,
      setupAgentSession: jest.fn()
    }))
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload')
    const { Instrument } = await import('./index')
    const spa = new Instrument(agentIdentifier, new Aggregator({}))
    importAggregatorFn()
    const loaded = await spa.onAggregateImported
    expect(loaded).toEqual(false)
  })
})
