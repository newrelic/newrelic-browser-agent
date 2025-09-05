import { faker } from '@faker-js/faker'
import { SR_EVENT_EMITTER_TYPES } from '../../../src/features/session_replay/constants'
import { IDEAL_PAYLOAD_SIZE, MAX_PAYLOAD_SIZE } from '../../../src/common/constants/agent-constants'
import { MODE, SESSION_EVENTS } from '../../../src/common/session/constants'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { resetAgent, setupAgent } from '../setup-agent'
import { Instrument as SessionReplay } from '../../../src/features/session_replay/instrument'
import * as consoleModule from '../../../src/common/util/console'

let mainAgent

beforeAll(() => {
  mainAgent = setupAgent()
  // stop JEST DOM from throwing errors with the stylesheet API
  mainAgent.init.session_replay.fix_stylesheets = false
})

let sessionReplayAggregate, session

beforeEach(async () => {
  document.body.innerHTML = `<span>${faker.lorem.paragraph()}</span>`
  jest.spyOn(consoleModule, 'warn').mockImplementation(() => {})

  const sessionReplayInstrument = new SessionReplay(mainAgent)
  await new Promise(process.nextTick)
  sessionReplayAggregate = sessionReplayInstrument.featAggregate

  // TODO MAKE SURE THIS WORKS WITH NEW SYSTEM
  mainAgent.runtime.harvester.initializedAggregates = [sessionReplayAggregate] // required for harvester to function
  jest.spyOn(mainAgent.runtime.harvester, 'triggerHarvestFor')

  session = mainAgent.runtime.session
})

afterEach(() => {
  resetAgent(mainAgent.agentIdentifier)
  mainAgent.runtime.harvester.triggerHarvestFor.mockRestore()
  jest.clearAllMocks()
})

describe('Session Replay Session Behavior', () => {
  test('when session ends', async () => {
    mainAgent.runtime.session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.initialized).toBeTruthy()
    expect(mainAgent.runtime.isRecording).toBeTruthy()

    sessionReplayAggregate.ee.emit(SESSION_EVENTS.RESET)
    await new Promise(process.nextTick)

    expect(mainAgent.runtime.isRecording).toBeFalsy()
    expect(sessionReplayAggregate.blocked).toBeTruthy()
  })

  test('when session is paused and resumed', async () => {
    mainAgent.runtime.session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.initialized).toBeTruthy()
    expect(mainAgent.runtime.isRecording).toBeTruthy()

    sessionReplayAggregate.ee.emit(SESSION_EVENTS.PAUSE)
    await new Promise(process.nextTick)
    expect(mainAgent.runtime.isRecording).toBeFalsy()

    sessionReplayAggregate.ee.emit(SESSION_EVENTS.RESUME)
    await new Promise(process.nextTick)
    expect(mainAgent.runtime.isRecording).toBeTruthy()
  })

  test('session SR mode matches SR mode -- FULL', async () => {
    mainAgent.runtime.session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(session.state.sessionReplayMode).toEqual(MODE.FULL)
    expect(sessionReplayAggregate.mode).toEqual(MODE.FULL)
  })

  test('session SR mode matches SR mode -- ERROR', async () => {
    mainAgent.runtime.session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
    await new Promise(process.nextTick)

    expect(session.state.sessionReplayMode).toEqual(MODE.ERROR)
    expect(sessionReplayAggregate.mode).toEqual(MODE.ERROR)
  })

  test('session SR mode matches SR mode -- OFF', async () => {
    mainAgent.runtime.session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.OFF }])
    await new Promise(process.nextTick)

    expect(session.state.sessionReplayMode).toEqual(MODE.OFF)
    expect(sessionReplayAggregate.mode).toEqual(MODE.OFF)
  })

  test('session SR mode is OFF when not entitled -- FULL', async () => {
    mainAgent.runtime.session.state.isNew = true
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 0, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(session.state.sessionReplayMode).toEqual(MODE.OFF)
    expect(sessionReplayAggregate.mode).toEqual(MODE.OFF)
  })

  test('session SR mode is OFF when not entitled -- ERROR', async () => {
    mainAgent.runtime.session.state.isNew = true
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

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)
    const newSessionReplayAggregate = sessionReplayInstrument.featAggregate

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.OFF }])
    await new Promise(process.nextTick)

    expect(newSessionReplayAggregate.mode).toEqual(MODE.FULL)
  })
})

describe('Session Replay Error Mode Behaviors', () => {
  test('an error BEFORE rrweb import starts running in ERROR from beginning (when not preloaded)', async () => {
    ee.get(mainAgent.agentIdentifier).emit(SR_EVENT_EMITTER_TYPES.ERROR_DURING_REPLAY, ['test1'], undefined, FEATURE_NAMES.sessionReplay, ee.get(mainAgent.agentIdentifier))

    const sessionReplayInstrument = new SessionReplay(mainAgent)
    await new Promise(process.nextTick)
    const newSessionReplayAggregate = sessionReplayInstrument.featAggregate

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
    await new Promise(process.nextTick)

    expect(newSessionReplayAggregate.mode).toEqual(MODE.ERROR)
  })

  test('an error AFTER rrweb import changes mode and starts harvester', async () => {
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.mode).toEqual(MODE.ERROR)

    ee.get(mainAgent.agentIdentifier).emit(SR_EVENT_EMITTER_TYPES.ERROR_DURING_REPLAY, ['test1'], undefined, FEATURE_NAMES.sessionReplay, ee.get(mainAgent.agentIdentifier))

    expect(sessionReplayAggregate.mode).toEqual(MODE.FULL)
  })
})

describe('Session Replay Payload Validation', () => {
  test('payload - minified', async () => {
    jest.spyOn(session, 'getDuration').mockReturnValue(1000)
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(1)

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
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(mainAgent.runtime.harvester.triggerHarvestFor.mock.calls.length).toBeGreaterThanOrEqual(1)

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
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(mainAgent.runtime.harvester.triggerHarvestFor).toHaveBeenCalledTimes(1)

    const harvestContents = jest.mocked(sessionReplayAggregate.getHarvestContents).mock.results[0].value
    expect(harvestContents.qs).toMatchObject(createAnyQueryMatcher())
    expect(harvestContents.qs.attributes.includes('content_encoding=gzip')).toEqual(true)
    expect(harvestContents.qs.attributes.includes('isFirstChunk=true')).toEqual(true)
    expect(harvestContents.body).toEqual(expect.any(Uint8Array))
    expect(JSON.parse(strFromU8(gunzipSync(harvestContents.body)))).toEqual(expect.any(Array))
  })

  test('uncompressed payload is provided to harvester when fflate import fails', async () => {
    jest.spyOn(session, 'getDuration').mockReturnValue(1000)
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(mainAgent.runtime.harvester.triggerHarvestFor.mock.calls.length).toBeGreaterThanOrEqual(1)

    const harvestContents = jest.mocked(sessionReplayAggregate.getHarvestContents).mock.results[0].value
    expect(harvestContents.qs).toMatchObject({
      protocol_version: '0',
      browser_monitoring_key: mainAgent.info.licenseKey
    })
    expect(harvestContents.qs.attributes.includes('content_encoding')).toEqual(false)
    expect(harvestContents.qs.attributes.includes('isFirstChunk')).toEqual(true)
    expect(harvestContents.body).toEqual(expect.any(Object))
  })

  test('Clears the event buffer when staged for harvesting', async () => {
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.recorder.getEvents().events.length).toEqual(0)
  })

  test('harvests early if exceeds limit', async () => {
    const before = Date.now()
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(mainAgent.runtime.harvester.triggerHarvestFor.mock.calls.length).toBeGreaterThanOrEqual(1)

    document.body.innerHTML = `<span>${faker.lorem.words(IDEAL_PAYLOAD_SIZE)}</span>`
    await new Promise(process.nextTick)
    const after = Date.now()
    expect(mainAgent.runtime.harvester.triggerHarvestFor.mock.calls.length).toBeGreaterThanOrEqual(2)

    expect(after - before).toBeLessThan(mainAgent.init.harvest.interval * 1000)
  })

  test('Aborts if exceeds total limit', async () => {
    jest.spyOn(sessionReplayAggregate, 'getHarvestContents')

    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)
    expect(mainAgent.runtime.harvester.triggerHarvestFor.mock.calls.length).toBeGreaterThanOrEqual(1)

    document.body.innerHTML = `<span>${faker.lorem.words(MAX_PAYLOAD_SIZE)}</span>`
    await new Promise(process.nextTick)

    expect(sessionReplayAggregate.blocked).toEqual(true)
    expect(sessionReplayAggregate.mode).toEqual(MODE.OFF)
  })

  test('Aborts if 429 response', async () => {
    sessionReplayAggregate.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
    await new Promise(process.nextTick)

    sessionReplayAggregate.postHarvestCleanup({ status: 429 })

    expect(sessionReplayAggregate.blocked).toEqual(true)
    expect(sessionReplayAggregate.mode).toEqual(MODE.OFF)
  })

  test('provides correct first and last timestamps, even when out of order', async () => {
    const now = Math.floor(performance.now())
    sessionReplayAggregate.timeKeeper = {
      correctAbsoluteTimestamp: jest.fn().mockImplementation(timestamp => timestamp),
      correctRelativeTimestamp: jest.fn().mockImplementation(timestamp => timestamp)
    }

    const newrelic_events = [
      { __newrelic: true, timestamp: 500 },
      { __newrelic: true, timestamp: 1500 },
      { __newrelic: true, timestamp: 1000 }
    ]

    const stock_events = [
      { timestamp: 500 },
      { timestamp: 1500 },
      { timestamp: 1000 }
    ]

    const undefined_events = [
      { },
      { },
      { }
    ]

    const newrelic_recorderEvents = {
      cycleTimestamp: 2000,
      events: newrelic_events
    }

    const stock_recorderEvents = {
      cycleTimestamp: 2000,
      events: stock_events
    }

    const undefined_recorderEvents = {
      cycleTimestamp: 2000,
      events: undefined_events
    }

    const newrelicTimestamps = sessionReplayAggregate.getFirstAndLastNodes(newrelic_events)
    expect(newrelicTimestamps.firstEvent.timestamp).toEqual(500)
    expect(newrelicTimestamps.lastEvent.timestamp).toEqual(1500)

    const newrelicHarvestContents = sessionReplayAggregate.getHarvestContents(newrelic_recorderEvents)
    expect(newrelicHarvestContents.qs.attributes.includes('replay.firstTimestamp=500')).toEqual(true)
    expect(newrelicHarvestContents.qs.attributes.includes('replay.lastTimestamp=1500')).toEqual(true)

    const stockTimestamps = sessionReplayAggregate.getFirstAndLastNodes(stock_events)
    expect(stockTimestamps.firstEvent.timestamp).toEqual(500)
    expect(stockTimestamps.lastEvent.timestamp).toEqual(1500)

    const stockHarvestContents = sessionReplayAggregate.getHarvestContents(stock_recorderEvents)
    expect(stockHarvestContents.qs.attributes.includes('replay.firstTimestamp=500')).toEqual(true)
    expect(stockHarvestContents.qs.attributes.includes('replay.lastTimestamp=1500')).toEqual(true)

    const undefinedTimestamps = sessionReplayAggregate.getFirstAndLastNodes(undefined_events)
    expect(undefinedTimestamps.firstEvent.timestamp).toEqual(undefined)
    expect(undefinedTimestamps.lastEvent.timestamp).toEqual(undefined)

    const undefinedHarvestContents = sessionReplayAggregate.getHarvestContents(undefined_recorderEvents)

    const attrs = Object.fromEntries(new URLSearchParams(undefinedHarvestContents.qs.attributes))
    expect(attrs['replay.firstTimestamp']).toEqual('2000') // cycleTimestamp is used as first timestamp
    expect(Number(attrs['replay.lastTimestamp'])).toEqual(expect.any(Number))
    expect(Number(attrs['replay.lastTimestamp'])).toBeGreaterThanOrEqual(now) // last timestamp should be greater than the start time of this test
  })
})

function createAnyQueryMatcher () {
  return {
    browser_monitoring_key: mainAgent.info.licenseKey,
    type: 'SessionReplay',
    app_id: mainAgent.info.applicationID,
    protocol_version: '0',
    attributes: expect.any(String)
  }
}
