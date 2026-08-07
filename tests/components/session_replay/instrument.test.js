import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as SessionReplay } from '../../../src/features/session_replay/instrument'
import * as nreumModule from '../../../src/common/window/nreum'
import { getAppSessionHash } from '../../../src/common/session/session-key'
import { SESSION_STORAGE_KEY_PREFIX } from '../../../src/common/session/constants'
import { MODE } from '../../specs/util/helpers'

/**
 * Creates a never-bootstrapped agent, distinct from the shared `mainAgent` below. Some tests need the
 * SessionReplay runtime bootstrap (session setup + Connector/Harvester creation) to actually run so they can
 * observe or interfere with it -- `mainAgent`'s bootstrap is cached after the first real Instrument in this
 * file uses it, so reusing it can't simulate "session doesn't exist/fails to init yet".
 * @param {object} sessionReplayInit - value for `init.session_replay`
 */
function setupFreshAgent (sessionReplayInit) {
  return setupAgent({
    init: {
      session_replay: sessionReplayInit
    },
    runtime: {
      timeKeeper: {
        correctAbsoluteTimestamp: jest.fn(x => x)
      }
    }
  })
}

let mainAgent

beforeAll(() => {
  mainAgent = setupFreshAgent({ preload: false, enabled: true })
})

afterEach(() => {
  if (jest.mocked(nreumModule.gosNREUMOriginals).mock) {
    jest.mocked(nreumModule.gosNREUMOriginals).mockRestore()
  }

  resetAgent(mainAgent)
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
  let localAgent

  beforeEach(() => {
    localStorage.clear()
    mainAgent.init.privacy.cookies_enabled = true
    mainAgent.init.session_trace.enabled = true
  })

  afterEach(() => {
    if (localAgent) resetAgent(localAgent)
    localAgent = undefined
  })

  test('with flag enabled and if session dne yet', async () => {
    localAgent = setupFreshAgent({ preload: true, enabled: true })
    localAgent.runtime.session = undefined

    const sessionReplayInstrument = new SessionReplay(localAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(localAgent.runtime.isRecording).toEqual(true)
  })

  test('when replay already on in existing session, even if preload flag disabled', async () => {
    Object.assign(mainAgent.init.session_replay, { preload: false, enabled: true })
    mainAgent.runtime.session.write({ sessionReplayMode: MODE.FULL })

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(mainAgent.runtime.isRecording).toEqual(true)
  })

  test('when replay already on in namespaced localStorage session, even if preload flag disabled', async () => {
    localAgent = setupFreshAgent({ preload: false, enabled: true })
    const namespacedKey = `${SESSION_STORAGE_KEY_PREFIX}${getAppSessionHash(localAgent.info.licenseKey, localAgent.info.applicationID)}`
    localStorage.setItem(namespacedKey, JSON.stringify({ sessionReplayMode: MODE.FULL }))
    localAgent.runtime.session = undefined

    const sessionReplayInstrument = new SessionReplay(localAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(localAgent.runtime.isRecording).toEqual(true)
  })

  test('stops preload recording if replay was already on in existing session but a pre-req is not met', async () => {
    mainAgent.init.privacy.cookies_enabled = false
    Object.assign(mainAgent.init.session_replay, { preload: false, enabled: true })
    mainAgent.runtime.session.write({ sessionReplayMode: MODE.FULL })

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    // shouldImportAgg is false here (missing prerequisite), which now always stops any preload recording.
    expect(mainAgent.runtime.isRecording).toEqual(false)
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

  // The first test below needs its own fresh agent (rather than the shared `mainAgent`) because the runtime
  // bootstrap (session setup + Connector/Harvester creation) only ever runs once per agent -- reusing
  // `mainAgent` would skip session setup entirely since it already succeeded in the tests above, so the
  // mocked `setupAgentSession` throw would never actually run.
  let localAgent

  afterEach(() => {
    if (localAgent) resetAgent(localAgent)
    localAgent = undefined
    jest.clearAllMocks()
  })

  test('session entity fails to initialize', async () => {
    jest.doMock('../../../src/features/utils/agent-session', () => ({
      __esModule: true,
      setupAgentSession: jest.fn(() => { throw new Error('RIP') })
    }))
    localAgent = setupFreshAgent({ preload: true, enabled: true })
    localAgent.runtime.session = undefined

    const sessionReplayInstrument = new SessionReplay(localAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(localAgent.runtime.isRecording).toEqual(false)
  })

  test('replay aggregate fails to initialize', async () => {
    jest.doMock('../../../src/features/session_replay/aggregate', () => ({
      __esModule: true,
      setupAgentSession: jest.fn(() => { throw new Error('RIP') })
    }))

    // This scenario doesn't need a fresh bootstrap (session setup already succeeded), so it can reuse `mainAgent`.
    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)

    expect(sessionReplayInstrument.recorder).toBeDefined()
    expect(mainAgent.runtime.isRecording).toEqual(false)
  })
})
