import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as SessionReplay } from '../../../src/features/session_replay/instrument'
import * as nreumModule from '../../../src/common/window/nreum'
import { MODE } from '../../specs/util/helpers'

let mainAgent, savedInitialSession

beforeAll(() => {
  mainAgent = setupAgent({
    init: {
      session_replay: { preload: false, enabled: true }
    }
  })
  savedInitialSession = mainAgent.runtime.session
})

afterEach(() => {
  if (!mainAgent.runtime.session) {
    mainAgent.runtime.session = savedInitialSession
  }
  if (jest.mocked(nreumModule.gosNREUMOriginals).mock) {
    jest.mocked(nreumModule.gosNREUMOriginals).mockRestore()
  }

  resetAgent(mainAgent.agentIdentifier)
  jest.clearAllMocks()
})

describe('Replay', () => { // this is moreso a test of the SR-specific logic within importAggregator() of instrument-base.js
  test('does import with all pre-req settings on - no preload', async () => {
    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeUndefined()
    expect(sessionReplayInstrument.featAggregate).toBeDefined()
  })

  test('does not import if MutationObserver is missing', async () => {
    jest.spyOn(nreumModule, 'gosNREUMOriginals').mockImplementation(() => ({ o: { MO: undefined } }))

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeUndefined()
    expect(sessionReplayInstrument.featAggregate).toBeUndefined()
  })

  test('does not import if cookies_enabled is false', async () => {
    mainAgent.init.privacy.cookies_enabled = false

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeUndefined()
    expect(sessionReplayInstrument.featAggregate).toBeUndefined()
  })

  test('does not import if session_trace is disabled', async () => {
    mainAgent.init.session_trace.enabled = false

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeUndefined()
    expect(sessionReplayInstrument.featAggregate).toBeUndefined()
  })

  test('does not import if session does not exist or failed to init', async () => {
    jest.doMock('../../../src/features/utils/agent-session', () => ({
      __esModule: true,
      setupAgentSession: jest.fn(() => { throw new Error('RIP') })
    }))

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeUndefined()
    expect(sessionReplayInstrument.featAggregate).toBeUndefined()

    jest.dontMock('../../../src/features/utils/agent-session')
  })
})

describe('Preload early records', () => {
  beforeEach(() => {
    localStorage.clear()
    mainAgent.init.privacy.cookies_enabled = true
    mainAgent.init.session_trace.enabled = true
  })

  test('with flag enabled and if session dne yet', async () => {
    mainAgent.runtime.session = undefined
    Object.assign(mainAgent.init.session_replay, { preload: true, enabled: true })

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(mainAgent.runtime.isRecording).toEqual(true)
  })

  test('when replay already on in existing session, even if preload flag disabled', async () => {
    Object.assign(mainAgent.init.session_replay, { preload: false, enabled: true })
    mainAgent.runtime.session.write({ sessionReplayMode: MODE.FULL })

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(mainAgent.runtime.isRecording).toEqual(true)
  })

  test('when replay already on in existing session, even if flag enabled but a pre-req is not', async () => {
    mainAgent.init.privacy.cookies_enabled = false
    Object.assign(mainAgent.init.session_replay, { preload: false, enabled: true })
    mainAgent.runtime.session.write({ sessionReplayMode: MODE.FULL })

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(mainAgent.runtime.isRecording).toEqual(true)
  })

  test('if replay is off in existing session, but all required flags are enabled', async () => {
    Object.assign(mainAgent.init.session_replay, { preload: true, enabled: true })
    mainAgent.runtime.session.write({ sessionReplayMode: MODE.OFF })

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(mainAgent.runtime.isRecording).toEqual(true)
  })
})

describe('Preload recording stops if', () => {
  beforeAll(() => {
    Object.assign(mainAgent.init.session_replay, { preload: true, enabled: true })
  })

  test('session entity fails to initialize', async () => {
    jest.doMock('../../../src/features/utils/agent-session', () => ({
      __esModule: true,
      setupAgentSession: jest.fn(() => { throw new Error('RIP') })
    }))
    mainAgent.runtime.session = undefined

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(mainAgent.runtime.isRecording).toEqual(false)
  })

  test('replay aggregate fails to initialize', async () => {
    jest.doMock('../../../src/features/session_replay/aggregate', () => ({
      __esModule: true,
      setupAgentSession: jest.fn(() => { throw new Error('RIP') })
    }))

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(mainAgent.runtime.isRecording).toEqual(false)
  })
})
