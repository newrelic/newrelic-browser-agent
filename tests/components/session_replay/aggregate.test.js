import { faker } from '@faker-js/faker'
import { IDEAL_PAYLOAD_SIZE, SR_EVENT_EMITTER_TYPES } from '../../../src/features/session_replay/constants'
import { MODE, SESSION_EVENTS } from '../../../src/common/session/constants'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as SessionReplay } from '../../../src/features/session_replay/instrument'
import * as consoleModule from '../../../src/common/util/console'
import { getRuntime } from '../../../src/common/config/runtime'
import { getInfo } from '../../../src/common/config/info'
import { MAX_PAYLOAD_SIZE } from '../../../src/common/constants/agent-constants'

let agentSetup

beforeAll(() => {
  agentSetup = setupAgent()
})

let sessionReplayAggregate, session

beforeEach(async () => {
  document.body.innerHTML = `<span>${faker.lorem.paragraph()}</span>`
  jest.spyOn(consoleModule, 'warn').mockImplementation(() => {})

  const sessionReplayInstrument = new SessionReplay(agentSetup.agentIdentifier, agentSetup.aggregator)
  await new Promise(process.nextTick)
  sessionReplayAggregate = sessionReplayInstrument.featAggregate

  jest.spyOn(sessionReplayAggregate.scheduler.harvest, '_send').mockImplementation(({ cbFinished }) => {
    cbFinished({ status: 200 })
  })

  session = getRuntime(agentSetup.agentIdentifier).session
})

afterEach(() => {
  resetAgent(agentSetup.agentIdentifier)
  jest.clearAllMocks()
})

describe('Session Replay Session Behavior', () => {
  test('when session ends', async () => {
    getRuntime(agentSetup.agentIdentifier).session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    jest.spyOn(sessionReplayAggregate.scheduler, 'runHarvest')

    expect(sessionReplayAggregate.initialized).toBeTruthy()
    expect(sessionReplayAggregate.recorder.recording).toBeTruthy()

    sessionReplayAggregate.ee.emit(SESSION_EVENTS.RESET)
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.scheduler.runHarvest).toHaveBeenCalled()
    expect(sessionReplayAggregate.recorder.recording).toBeFalsy()
    expect(sessionReplayAggregate.blocked).toBeTruthy()
  })

  test('when session is paused and resumed', async () => {
    getRuntime(agentSetup.agentIdentifier).session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.initialized).toBeTruthy()
    expect(sessionReplayAggregate.recorder.recording).toBeTruthy()

    sessionReplayAggregate.ee.emit(SESSION_EVENTS.PAUSE)
    await new Promise(process.nextTick)
    expect(sessionReplayAggregate.recorder.recording).toBeFalsy()

    sessionReplayAggregate.ee.emit(SESSION_EVENTS.RESUME)
    await new Promise(process.nextTick)
    expect(sessionReplayAggregate.recorder.recording).toBeTruthy()
  })

  test('session SR mode matches SR mode -- FULL', async () => {
    getRuntime(agentSetup.agentIdentifier).session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(session.state.sessionReplayMode).toEqual(MODE.FULL)
    expect(sessionReplayAggregate.mode).toEqual(MODE.FULL)
  })

  test('session SR mode matches SR mode -- ERROR', async () => {
    getRuntime(agentSetup.agentIdentifier).session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
    await new Promise(process.nextTick)

    expect(session.state.sessionReplayMode).toEqual(MODE.ERROR)
    expect(sessionReplayAggregate.mode).toEqual(MODE.ERROR)
  })

  test('session SR mode matches SR mode -- OFF', async () => {
    getRuntime(agentSetup.agentIdentifier).session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.OFF }])
    await new Promise(process.nextTick)

    expect(session.state.sessionReplayMode).toEqual(MODE.OFF)
    expect(sessionReplayAggregate.mode).toEqual(MODE.OFF)
  })

  test('session SR mode is OFF when not entitled -- FULL', async () => {
    getRuntime(agentSetup.agentIdentifier).session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 0, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(session.state.sessionReplayMode).toEqual(MODE.OFF)
    expect(sessionReplayAggregate.mode).toEqual(MODE.OFF)
  })

  test('session SR mode is OFF when not entitled -- ERROR', async () => {
    getRuntime(agentSetup.agentIdentifier).session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 0, srs: MODE.ERROR }])
    await new Promise(process.nextTick)

    expect(session.state.sessionReplayMode).toEqual(MODE.OFF)
    expect(sessionReplayAggregate.mode).toEqual(MODE.OFF)
  })
})

describe('Session Replay Initialization Behavior', () => {
  test('waits for sr flags', async () => {
    expect(sessionReplayAggregate.initialized).toEqual(false)
    expect(sessionReplayAggregate.recorder).toBeUndefined()

    // emit a false flag
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 0, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.initialized).toEqual(false) // early returns
    expect(sessionReplayAggregate.recorder).toBeUndefined()
  })
})

describe('Session Replay Sample -> Mode Behaviors', () => {
  test('new session -- Full', async () => {
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.mode).toEqual(MODE.FULL)
  })

  test('new session -- Error', async () => {
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.mode).toEqual(MODE.ERROR)
  })

  test('existing session -- should inherit mode from session entity and ignore samples', async () => {
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    session.isNew = false

    const sessionReplayInstrument = new SessionReplay(agentSetup.agentIdentifier, agentSetup.aggregator)
    await new Promise(process.nextTick)
    const newSessionReplayAggregate = sessionReplayInstrument.featAggregate

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.OFF }])
    await new Promise(process.nextTick)

    expect(newSessionReplayAggregate.mode).toEqual(MODE.FULL)
  })
})

describe('Session Replay Error Mode Behaviors', () => {
  test('an error BEFORE rrweb import starts running in ERROR from beginning (when not preloaded)', async () => {
    ee.get(agentSetup.agentIdentifier).emit(SR_EVENT_EMITTER_TYPES.ERROR_DURING_REPLAY, ['test1'], undefined, FEATURE_NAMES.sessionReplay, ee.get(agentSetup.agentIdentifier))

    const sessionReplayInstrument = new SessionReplay(agentSetup.agentIdentifier, agentSetup.aggregator)
    await new Promise(process.nextTick)
    const newSessionReplayAggregate = sessionReplayInstrument.featAggregate

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
    await new Promise(process.nextTick)

    expect(newSessionReplayAggregate.mode).toEqual(MODE.ERROR)
    expect(newSessionReplayAggregate.scheduler.started).toEqual(false)
  })

  test('an error AFTER rrweb import changes mode and starts harvester', async () => {
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.mode).toEqual(MODE.ERROR)
    expect(sessionReplayAggregate.scheduler.started).toEqual(false)

    ee.get(agentSetup.agentIdentifier).emit(SR_EVENT_EMITTER_TYPES.ERROR_DURING_REPLAY, ['test1'], undefined, FEATURE_NAMES.sessionReplay, ee.get(agentSetup.agentIdentifier))

    expect(sessionReplayAggregate.mode).toEqual(MODE.FULL)
    expect(sessionReplayAggregate.scheduler.started).toEqual(true)
  })
})

describe('Session Replay Payload Validation', () => {
  test('payload - minified', async () => {
    jest.spyOn(session, 'getDuration').mockReturnValue(1000)
    jest.spyOn(sessionReplayAggregate.scheduler, 'runHarvest')
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(sessionReplayAggregate.scheduler.runHarvest).toHaveBeenCalledTimes(1)

    const harvestContents = jest.mocked(sessionReplayAggregate.getHarvestContents).mock.results[0].value
    expect(harvestContents.qs).toMatchObject(createAnyQueryMatcher())
    expect(harvestContents.qs.attributes.includes('session.durationMs')).toEqual(true)

    const urlParams = new URLSearchParams(harvestContents.qs.attributes)
    expect(Number(urlParams.get('session.durationMs'))).toBeGreaterThan(0)
    expect(harvestContents.body).toEqual(expect.any(Uint8Array))
    expect(harvestContents.body.length).toBeGreaterThan(0)
  })

  test('payload - unminified', async () => {
    jest.doMock('fflate', () => ({
      __esModule: true,
      gzipSync: jest.fn().mockImplementation(() => { throw new Error() })
    }))

    jest.spyOn(session, 'getDuration').mockReturnValue(1000)
    jest.spyOn(sessionReplayAggregate.scheduler, 'runHarvest')
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(sessionReplayAggregate.scheduler.runHarvest).toHaveBeenCalledTimes(1)

    const harvestContents = jest.mocked(sessionReplayAggregate.getHarvestContents).mock.results[0].value
    expect(harvestContents.qs).toMatchObject(createAnyQueryMatcher())
    expect(harvestContents.qs.attributes.includes('session.durationMs')).toEqual(true)

    const urlParams = new URLSearchParams(harvestContents.qs.attributes)
    expect(Number(urlParams.get('session.durationMs'))).toBeGreaterThan(0)
    expect(harvestContents.body).toEqual(expect.any(Array))
    expect(harvestContents.body.length).toBeGreaterThan(0)
  })
})

describe('Session Replay Harvest Behaviors', () => {
  beforeEach(() => {
    jest.doMock('fflate', () => ({
      __esModule: true,
      gzipSync: jest.fn().mockImplementation(() => { throw new Error() })
    }))
  })

  test('compressed payload is provided to harvester', async () => {
    jest.unmock('fflate')
    const { gunzipSync, strFromU8 } = await import('fflate')

    jest.spyOn(session, 'getDuration').mockReturnValue(1000)
    jest.spyOn(sessionReplayAggregate.scheduler, 'runHarvest')
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(sessionReplayAggregate.scheduler.runHarvest).toHaveBeenCalledTimes(1)

    const harvestContents = jest.mocked(sessionReplayAggregate.getHarvestContents).mock.results[0].value
    expect(harvestContents.qs).toMatchObject(createAnyQueryMatcher())
    expect(harvestContents.qs.attributes.includes('content_encoding=gzip')).toEqual(true)
    expect(harvestContents.qs.attributes.includes('isFirstChunk=true')).toEqual(true)
    expect(harvestContents.body).toEqual(expect.any(Uint8Array))
    expect(JSON.parse(strFromU8(gunzipSync(harvestContents.body)))).toEqual(expect.any(Array))
  })

  test('uncompressed payload is provided to harvester when fflate import fails', async () => {
    jest.spyOn(session, 'getDuration').mockReturnValue(1000)
    jest.spyOn(sessionReplayAggregate.scheduler, 'runHarvest')
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(sessionReplayAggregate.scheduler.runHarvest).toHaveBeenCalledTimes(1)

    const harvestContents = jest.mocked(sessionReplayAggregate.getHarvestContents).mock.results[0].value
    expect(harvestContents.qs).toMatchObject({
      protocol_version: '0',
      browser_monitoring_key: getInfo(agentSetup.agentIdentifier).licenseKey
    })
    expect(harvestContents.qs.attributes.includes('content_encoding')).toEqual(false)
    expect(harvestContents.qs.attributes.includes('isFirstChunk')).toEqual(true)
    expect(harvestContents.body).toEqual(expect.any(Object))
  })

  test('Clears the event buffer when staged for harvesting', async () => {
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.recorder.getEvents().events.length).toEqual(0)
    expect(sessionReplayAggregate.recorder.getEvents().events.length).toEqual(0)
  })

  test('harvests early if exceeds limit', async () => {
    jest.spyOn(sessionReplayAggregate.scheduler, 'runHarvest')

    const before = Date.now()
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(sessionReplayAggregate.scheduler.runHarvest).toHaveBeenCalledTimes(1)

    document.body.innerHTML = `<span>${faker.lorem.words(IDEAL_PAYLOAD_SIZE)}</span>`
    await new Promise(process.nextTick)
    const after = Date.now()

    expect(after - before).toBeLessThan(sessionReplayAggregate.harvestTimeSeconds * 1000)
  })

  test('Aborts if exceeds total limit', async () => {
    jest.spyOn(sessionReplayAggregate.scheduler, 'runHarvest')
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(sessionReplayAggregate.scheduler.runHarvest).toHaveBeenCalledTimes(1)

    document.body.innerHTML = `<span>${faker.lorem.words(MAX_PAYLOAD_SIZE)}</span>`
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.blocked).toEqual(true)
    expect(sessionReplayAggregate.mode).toEqual(MODE.OFF)
  })

  test('Aborts if 429 response', async () => {
    jest.spyOn(sessionReplayAggregate.scheduler.harvest, '_send').mockImplementation(({ cbFinished }) => {
      cbFinished({ status: 429 })
    })

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.blocked).toEqual(true)
    expect(sessionReplayAggregate.mode).toEqual(MODE.OFF)
  })
})

function createAnyQueryMatcher () {
  const info = getInfo(agentSetup.agentIdentifier)
  return {
    browser_monitoring_key: info.licenseKey,
    type: 'SessionReplay',
    app_id: info.applicationID,
    protocol_version: '0',
    attributes: expect.any(String)
  }
}
