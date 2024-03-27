import { Instrument as SRInstrument } from './index'
import { Aggregator } from '../../../common/aggregate/aggregator'
import { getConfigurationValue, originals } from '../../../common/config/config'
import { PREFIX, DEFAULT_KEY, MODE } from '../../../common/session/constants'
import { canEnableSessionTracking } from '../../utils/feature-gates'

jest.mock('../../../common/constants/runtime', () => ({
  __esModule: true,
  isBrowserScope: true,
  globalScope: global
}))
jest.mock('../../../common/window/load', () => ({
  __esModule: true,
  onWindowLoad: jest.fn(cb => cb())
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
jest.mock('../shared/recorder', () => ({
  __esModule: true,
  Recorder: jest.fn().mockImplementation(() => {
    return {
      startRecording: jest.fn(),
      stopRecording: jest.fn()
    }
  })
}))
jest.mock('../../../common/util/console', () => ({
  __esModule: true,
  warn: jest.fn()
}))
jest.mock('../../utils/feature-gates', () => ({
  __esModule: true,
  canEnableSessionTracking: jest.fn(() => true)
}))

let agentIdentifier

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
  agentIdentifier = (Math.random() + 1).toString(36).substring(7)
})

describe('Replay', () => { // this is moreso a test of the SR-specific logic within importAggregator() of instrument-base.js
  test('does import with all pre-req settings on', async () => {
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload') // not testing preload behavior yet
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))
    expect(sr.recorder).toBeUndefined() // should not have set preload recorder with flag off and no existing session!

    const loaded = await sr.onAggregateImported
    expect(loaded).toEqual(true)
  })

  test('does not import if MutationObserver is missing', async () => {
    originals.MO = undefined
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload')
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))

    const loaded = await sr.onAggregateImported
    expect(loaded).toEqual(false)

    originals.MO = true // restore this for other test use
  })

  test('does not import if cookies_enabled is false', async () => {
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload' && setting !== 'privacy.cookies_enabled')
    canEnableSessionTracking.mockImplementation((agentId) => getConfigurationValue(agentId, 'privacy.cookies_enabled'))
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))

    const loaded = await sr.onAggregateImported
    expect(loaded).toEqual(false)
  })

  test('does not import if session_trace is disabled', async () => {
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload' && setting !== 'session_trace.enabled')
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))

    const loaded = await sr.onAggregateImported
    expect(loaded).toEqual(false)
  })

  test('does not import if session does not exist or failed to init', async () => {
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload')
    canEnableSessionTracking.mockReturnValue(false)
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))

    const loaded = await sr.onAggregateImported
    expect(loaded).toEqual(false)
  })
})

describe('Preload early records', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('with flag enabled and if session dne yet', async () => {
    getConfigurationValue.mockImplementation(() => true)
    canEnableSessionTracking.mockReturnValue(true)
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))
    await new Promise(process.nextTick)
    expect(sr.recorder.startRecording).toHaveBeenCalled()
  })

  test('when replay already on in existing session, even if preload flag disabled', async () => {
    localStorage.setItem(`${PREFIX}_${DEFAULT_KEY}`, JSON.stringify({ sessionReplayMode: MODE.FULL }))
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'session_replay.preload')
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))
    await new Promise(process.nextTick)
    expect(sr.recorder.startRecording).toHaveBeenCalled()
  })

  test('when replay already on in existing session, even if flag enabled but a pre-req is not', async () => {
    localStorage.setItem(`${PREFIX}_${DEFAULT_KEY}`, JSON.stringify({ sessionReplayMode: MODE.ERROR }))
    getConfigurationValue.mockImplementation((_, setting) => setting !== 'privacy.cookies_enabled')
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))
    await new Promise(process.nextTick)
    expect(sr.recorder.startRecording).toHaveBeenCalled()
  })

  test('if replay is off in existing session, but all required flags are enabled', async () => {
    localStorage.setItem(`${PREFIX}_${DEFAULT_KEY}`, JSON.stringify({ sessionReplayMode: MODE.OFF }))
    getConfigurationValue.mockImplementation(() => true)
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))
    await new Promise(process.nextTick)
    expect(sr.recorder.startRecording).toHaveBeenCalled()
  })
})

describe('Preload recording stops if', () => {
  beforeAll(() => {
    getConfigurationValue.mockReturnValue(true)
  })

  test('session entity fails to initialize', async () => {
    jest.doMock('../../utils/agent-session', () => ({
      __esModule: true,
      setupAgentSession: jest.fn(() => { throw new Error('RIP') })
    }))
    getConfigurationValue.mockImplementation((_, setting) => true) // not testing preload behavior yet
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))
    await new Promise(process.nextTick) // since the startRecording -> importAggregator chain is async
    expect(sr.recorder.startRecording).toHaveBeenCalled()

    const loaded = await sr.onAggregateImported
    expect(loaded).toEqual(false)
    expect(sr.featAggregate).toBeUndefined() // aggregate also shouldn't have been imported if session entity fails
  })

  test('replay aggregate fails to initialize', async () => {
    let aggConstructor = jest.fn(() => { throw new Error('RIP') })
    jest.doMock('../aggregate/index.js', () => ({
      __esModule: true,
      Aggregate: aggConstructor
    }))
    const sr = new SRInstrument(agentIdentifier, new Aggregator({}))
    await new Promise(process.nextTick)
    expect(sr.recorder.startRecording).toHaveBeenCalled()

    const loaded = await sr.onAggregateImported
    expect(loaded).toEqual(false)
  })
})
