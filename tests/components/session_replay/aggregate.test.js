import { AVG_COMPRESSION } from '../../../src/features/session_replay/constants'
import { Aggregator } from '../../../src/common/aggregate/aggregator'
import { SessionEntity } from '../../../src/common/session/session-entity'
import { setConfiguration, setRuntime } from '../../../src/common/config/config'
import { configure } from '../../../src/loaders/configure/configure'
import { Recorder } from '../../../src/features/session_replay/shared/recorder'
import { MODE, SESSION_EVENTS } from '../../../src/common/session/constants'
import { setNREUMInitializedAgent } from '../../../src/common/window/nreum'
import { FEATURE_NAMES } from '../../../src/loaders/features/features'
import { ee } from '../../../src/common/event-emitter/contextual-ee'
import { TimeKeeper } from '../../../src/common/timing/time-keeper'
import { LocalMemory } from '../session-helpers'
import { IDEAL_PAYLOAD_SIZE } from '../../../src/common/constants/agent-constants'

let sr, session

jest.mock('../../../src/common/util/console', () => ({
  warn: jest.fn()
}))

const model = {
  value: '',
  inactiveAt: 0,
  expiresAt: 0,
  updatedAt: Date.now(),
  sessionReplayMode: 0,
  sessionReplaySentFirstChunk: false,
  sessionTraceMode: 0,
  traceHarvestStarted: false,
  serverTimeDiff: null,
  custom: {}
}
let SessionReplayAgg
let agentIdentifier = 'abcd'
const info = { licenseKey: 1234, applicationID: 9876 }
const init = { session_replay: { enabled: true } }

const anyQuery = {
  browser_monitoring_key: info.licenseKey,
  type: 'SessionReplay',
  app_id: Number(info.applicationID),
  protocol_version: '0',
  attributes: expect.any(String)
}

describe('Session Replay', () => {
  beforeEach(async () => {
    agentIdentifier = (Math.random() + 1).toString(36).substring(7)
    const { Aggregate } = await import('../../../src/features/session_replay/aggregate')
    SessionReplayAgg = Aggregate
    primeSessionAndReplay()
  })

  afterEach(async () => {
    sr.abort('jest test manually aborted')
    sr.ee.abort()
    jest.resetAllMocks()
    jest.clearAllMocks()
  })

  describe('Session Replay Session Behavior', () => {
    test('When Session Ends', async () => {
      const xhrMockClass = () => ({
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        addEventListener: jest.fn()
      })
      global.XMLHttpRequest = jest.fn().mockImplementation(xhrMockClass)

      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.scheduler.runHarvest = jest.fn()
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      await wait(1)
      expect(sr.initialized).toBeTruthy()
      expect(sr.recorder.recording).toBeTruthy()
      sr.ee.emit(SESSION_EVENTS.RESET)
      expect(sr.scheduler.runHarvest).toHaveBeenCalled()
      expect(sr.recorder.recording).toBeFalsy()
      expect(sr.blocked).toBeTruthy()
    })

    test('When Session Is Paused/Resumed', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      await wait(1)
      expect(sr.initialized).toBeTruthy()
      expect(sr.recorder.recording).toBeTruthy()
      sr.ee.emit(SESSION_EVENTS.PAUSE)
      expect(sr.recorder.recording).toBeFalsy()
      sr.ee.emit(SESSION_EVENTS.RESUME)
      expect(sr.recorder.recording).toBeTruthy()
    })

    test('Session SR mode matches SR mode -- FULL', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      await wait(1)
      expect(session.state.sessionReplayMode).toEqual(sr.mode)
    })

    test('Session SR mode matches SR mode -- ERROR', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
      await wait(1)
      expect(session.state.sessionReplayMode).toEqual(sr.mode)
    })

    test('Session SR mode matches SR mode -- OFF', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.OFF }])
      await wait(1)
      expect(session.state.sessionReplayMode).toEqual(sr.mode)
    })

    test('Session SR mode is OFF when not entitled -- FULL', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 0, srs: MODE.FULL }])
      await wait(1)
      expect(sr.mode).toEqual(MODE.OFF)
    })

    test('Session SR mode is OFF when not entitled -- ERROR', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 0, srs: MODE.ERROR }])
      await wait(1)
      expect(sr.mode).toEqual(MODE.OFF)
    })
  })

  describe('Session Replay Initialization Behavior', () => {
    test('Waits for SR', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      // do not emit sr flag
      await wait(1000)
      expect(sr.initialized).toEqual(false)
      expect(sr.recorder).toBeUndefined()

      // emit a false flag
      sr.ee.emit('rumresp', [{ sr: 0, srs: MODE.FULL }])
      await wait(1)
      expect(sr.initialized).toEqual(false) // early returns
      expect(sr.recorder).toBeUndefined()
    })
  })

  describe('Session Replay Sample -> Mode Behaviors', () => {
    test('New Session -- Full', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      await wait(1)
      expect(sr.mode).toEqual(MODE.FULL)
    })

    test('New Session -- Error', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
      await wait(1)
      expect(sr.mode).toEqual(MODE.ERROR)
    })

    test('Existing Session -- Should inherit mode from session entity and ignore samples', async () => {
      const storage = new LocalMemory({ NRBA_SESSION: { ...model, value: 'abcdefghijklmnop', expiresAt: Date.now() + 10000, inactiveAt: Date.now() + 10000, sessionReplayMode: MODE.FULL, sessionReplaySentFirstChunk: true, sessionTraceMode: MODE.FULL } })
      session = new SessionEntity({ agentIdentifier, key: 'SESSION', storage })
      expect(session.isNew).toBeFalsy()
      primeSessionAndReplay(session)
      // configure to get "error" sample ---> but should inherit FULL from session manager
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      await wait(1)
      expect(sr.mode).toEqual(MODE.FULL)
    })
  })

  describe('Session Replay Error Mode Behaviors', () => {
    test('An error BEFORE rrweb import starts running in ERROR from beginning (when not preloaded)', async () => {
      setConfiguration(agentIdentifier, { ...init })
      ee.get(agentIdentifier).emit('errorDuringReplay', ['test1'], undefined, FEATURE_NAMES.sessionReplay, ee.get(agentIdentifier))
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
      await wait(100)
      expect(sr.mode).toEqual(MODE.ERROR)
      expect(sr.scheduler.started).toEqual(false)
    })

    test('An error AFTER rrweb import changes mode and starts harvester', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.ERROR }])
      await wait(1)
      expect(sr.mode).toEqual(MODE.ERROR)
      expect(sr.scheduler.started).toEqual(false)
      sr.ee.emit('errorDuringReplay', ['test2'])
      expect(sr.mode).toEqual(MODE.FULL)
      expect(sr.scheduler.started).toEqual(true)
    })
  })

  describe('Session Replay Payload Validation', () => {
    test('Payload', async () => {
      const storage = new LocalMemory({ NRBA_SESSION: { ...model, value: 'abcdefghijklmnop', expiresAt: Date.now() + 10000, inactiveAt: Date.now() + 10000, sessionReplayMode: MODE.FULL, sessionReplaySentFirstChunk: true, sessionTraceMode: MODE.FULL } })
      session = new SessionEntity({ agentIdentifier, key: 'SESSION', storage })
      primeSessionAndReplay(session)
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      sr.scheduler.runHarvest = jest.fn()
      await wait(1)
      expect(sr.scheduler.runHarvest).toHaveBeenCalledTimes(1)
      const harvestContents = sr.getHarvestContents()
      // query attrs
      expect(harvestContents.qs).toMatchObject(anyQuery)

      expect(harvestContents.qs.attributes.includes('session.durationMs')).toEqual(true)
      const urlParams = new URLSearchParams(harvestContents.qs.attributes)
      expect(Number(urlParams.get('session.durationMs'))).toBeGreaterThan(0)

      expect(harvestContents.body).toEqual(expect.any(Array))

      expect(harvestContents.body.length).toBeGreaterThan(0)
    })
  })

  describe('Session Replay Harvest Behaviors', () => {
    test('Compressed payload is provided to harvester', async () => {
      const { gunzipSync, strFromU8 } = await import('fflate')
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      sr.scheduler.runHarvest = jest.fn()
      await wait(1)
      const [harvestContents] = sr.prepareHarvest()
      expect(harvestContents.qs).toMatchObject(anyQuery)
      expect(harvestContents.qs.attributes.includes('content_encoding=gzip')).toEqual(true)
      expect(harvestContents.qs.attributes.includes('isFirstChunk=true')).toEqual(true)
      expect(harvestContents.body).toEqual(expect.any(Uint8Array))
      expect(JSON.parse(strFromU8(gunzipSync(harvestContents.body)))).toMatchObject(expect.any(Array))
    })

    test('Uncompressed payload is provided to harvester', async () => {
      jest.doMock('fflate', () => ({
        __esModule: true,
        gzipSync: jest.fn().mockImplementation(() => { throw new Error() })
      }))

      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      sr.scheduler.runHarvest = jest.fn()
      await wait(1)

      sr.gzipper = undefined

      const [harvestContents] = sr.prepareHarvest()
      expect(harvestContents.qs).toMatchObject({
        protocol_version: '0',
        browser_monitoring_key: info.licenseKey
      })
      expect(harvestContents.qs.attributes.includes('content_encoding')).toEqual(false)
      expect(harvestContents.qs.attributes.includes('isFirstChunk')).toEqual(true)
      expect(harvestContents.body).toEqual(expect.any(Object))
    })

    test('Clears the event buffer when staged for harvesting', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      await wait(1)

      sr.gzipper = undefined
      sr.prepareHarvest()
      expect(sr.recorder.getEvents().events.length).toEqual(0)
    })

    test('Harvests early if exceeds limit', async () => {
      let after = 0
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.recorder = new Recorder(sr)
      sr.recorder.currentBufferTarget.add({ x: 'x'.repeat(IDEAL_PAYLOAD_SIZE / AVG_COMPRESSION) })
      const before = Date.now()
      const spy = jest.spyOn(sr.scheduler, 'runHarvest').mockImplementation(() => { after = Date.now() })
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      await wait(1)
      expect(spy).toHaveBeenCalled()
      expect(after - before).toBeLessThan(sr.harvestTimeSeconds * 1000)
    })

    test('Aborts if exceeds total limit', async () => {
      jest.doMock('fflate', () => ({
        __esModule: true,
        gzipSync: jest.fn().mockImplementation(() => { throw new Error() })
      }))
      const spy = jest.spyOn(sr.scheduler.harvest, '_send')
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.recorder = new Recorder(sr)
      Array.from({ length: 100000 }).forEach(() => sr.recorder.currentBufferTarget.add({ test: 1 })) //  fill the events array with tons of events
      // sr.recorder.currentBufferTarget.payloadBytesEstimation = sr.recorder.currentBufferTarget.events.join('').length
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      await wait(1)
      expect(spy).not.toHaveBeenCalled()
      expect(sr.blocked).toEqual(true)
      expect(sr.mode).toEqual(MODE.OFF)
    })

    test('Aborts if 429 response', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp', [{ sr: 1, srs: MODE.FULL }])
      await wait(1)
      expect(sr.mode).toEqual(MODE.FULL)
      sr.onHarvestFinished({ status: 429 })
      expect(sr.blocked).toEqual(true)
      expect(sr.mode).toEqual(MODE.OFF)
    })
  })
})

function wait (ms = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function primeSessionAndReplay (sess = new SessionEntity({ agentIdentifier, key: 'SESSION', storage: new LocalMemory() })) {
  const agent = { agentIdentifier }
  setNREUMInitializedAgent(agentIdentifier, agent)
  session = sess
  configure(agent, { info, runtime: { session, isolatedBacklog: false }, init: {} }, 'test', true)

  const timeKeeper = new TimeKeeper(agentIdentifier, ee.get(agentIdentifier))
  timeKeeper.processRumRequest({
    getResponseHeader: jest.fn(() => (new Date()).toUTCString())
  }, 450, 600)
  setRuntime(agentIdentifier, { timeKeeper, session: sess })
}
