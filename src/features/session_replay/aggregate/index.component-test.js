import { Aggregate as SessionReplayAgg, AVG_COMPRESSION, MAX_PAYLOAD_SIZE, IDEAL_PAYLOAD_SIZE } from '.'
import { Aggregator } from '../../../common/aggregate/aggregator'
import { SESSION_EVENTS, SessionEntity, MODE } from '../../../common/session/session-entity'
import { setConfiguration } from '../../../common/config/config'
import { configure } from '../../../loaders/configure/configure'

class LocalMemory {
  constructor (initialState = {}) {
    this.state = initialState
  }

  get (key) {
    try {
      return this.state[key]
    } catch (err) {
      return ''
    }
  }

  set (key, value) {
    try {
      if (value === undefined || value === null) return this.remove(key)
      this.state[key] = value
    } catch (err) {
      return
    }
  }

  remove (key) {
    try {
      delete this.state[key]
    } catch (err) {
      return
    }
  }
}

let sr, session
const agentIdentifier = 'abcd'
const info = { licenseKey: 1234, applicationID: 9876 }
const init = { session_replay: { enabled: true, sampleRate: 1, errorSampleRate: 0 } }

const anyQuery = {
  browser_monitoring_key: info.licenseKey,
  type: 'SessionReplay',
  app_id: Number(info.applicationID),
  protocol_version: '0',
  attributes: expect.any(String)
}

describe('Session Replay', () => {
  beforeEach(async () => {
    primeSessionAndReplay()
  })
  afterEach(async () => {
    sr.abort()
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
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.initialized).toBeTruthy()
      expect(sr.recording).toBeTruthy()
      sr.ee.emit(SESSION_EVENTS.RESET)
      expect(global.XMLHttpRequest).toHaveBeenCalled()
      expect(sr.recording).toBeFalsy()
      expect(sr.blocked).toBeTruthy()
    })

    test('When Session Is Paused/Resumed', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.initialized).toBeTruthy()
      expect(sr.recording).toBeTruthy()
      sr.ee.emit(SESSION_EVENTS.PAUSE)
      expect(sr.recording).toBeFalsy()
      sr.ee.emit(SESSION_EVENTS.RESUME)
      expect(sr.recording).toBeTruthy()
    })

    test('Session SR mode matches SR mode -- FULL', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(session.state.sessionReplay).toEqual(sr.mode)
    })

    test('Session SR mode matches SR mode -- ERROR', async () => {
      setConfiguration(agentIdentifier, { session_replay: { sampleRate: 0, errorSampleRate: 1 } })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(session.state.sessionReplay).toEqual(sr.mode)
      return
    })

    test('Session SR mode matches SR mode -- OFF', async () => {
      setConfiguration(agentIdentifier, { session_replay: { sampleRate: 0, errorSampleRate: 0 } })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(session.state.sessionReplay).toEqual(sr.mode)
      return
    })
  })

  describe('Session Replay Initialization Behavior', () => {
    test('Waits for SR', async () => {
      setConfiguration(agentIdentifier, { ...init })
      // do not emit sr flag
      await wait(1000)
      expect(sr.initialized).toEqual(false)
      expect(sr.recording).toEqual(false)

      // emit a false flag
      sr.ee.emit('rumresp-sr', [false])
      await wait(1)
      expect(sr.initialized).toEqual(true)
      expect(sr.recording).toEqual(false)
      return
    })

    test('Does not run if cookies_enabled is false', async () => {
      setConfiguration(agentIdentifier, { ...init, privacy: { cookies_enabled: false } })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.initialized).toEqual(false)
      expect(sr.recording).toEqual(false)
      return
    })

    test('Does not run if session_trace is disabled', async () => {
      setConfiguration(agentIdentifier, { ...init, session_trace: { enabled: false } })
      sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.initialized).toEqual(false)
      expect(sr.recording).toEqual(false)
      return
    })
  })

  describe('Session Replay Sample -> Mode Behaviors', () => {
    test('New Session -- Full 1 Error 1 === FULL', async () => {
      setConfiguration(agentIdentifier, { session_replay: { errorSampleRate: 1, sampleRate: 1 } })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.mode).toEqual(MODE.FULL)
      return
    })

    test('New Session -- Full 1 Error 0 === FULL', async () => {
      setConfiguration(agentIdentifier, { session_replay: { errorSampleRate: 0, sampleRate: 1 } })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.mode).toEqual(MODE.FULL)
      return
    })

    test('New Session -- Full 0 Error 1 === ERROR', async () => {
      setConfiguration(agentIdentifier, { session_replay: { errorSampleRate: 1, sampleRate: 0 } })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.mode).toEqual(MODE.ERROR)
      return
    })

    test('New Session -- Full 0 Error 0 === OFF', async () => {
      setConfiguration(agentIdentifier, { session_replay: { errorSampleRate: 0, sampleRate: 0 } })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.mode).toEqual(MODE.OFF)
      return
    })

    test('Existing Session -- Should inherit mode from session entity and ignore samples', async () => {
      const storage = new LocalMemory({ NRBA_SESSION: { value: 'abcdefghijklmnop', expiresAt: Date.now() + 10000, inactiveAt: Date.now() + 10000, updatedAt: Date.now(), sessionReplay: MODE.FULL, sessionTraceMode: MODE.FULL, custom: {} } })
      session = new SessionEntity({ agentIdentifier, key: 'SESSION', storage })
      expect(session.isNew).toBeFalsy()
      primeSessionAndReplay(session)
      // configure to get "error" sample ---> but should inherit FULL from session manager
      setConfiguration(agentIdentifier, { session_replay: { errorSampleRate: 1, sampleRate: 0 } })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.mode).toEqual(MODE.FULL)
      return
    })
  })

  describe('Session Replay Error Mode Behaviors', () => {
    test('An error BEFORE rrweb import starts running in FULL from beginning', async () => {
      setConfiguration(agentIdentifier, { session_replay: { errorSampleRate: 1, sampleRate: 0 } })
      sr.ee.emit('errorAgg')
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.mode).toEqual(MODE.FULL)
      expect(sr.scheduler.started).toEqual(true)
      return
    })

    test('An error AFTER rrweb import changes mode and starts harvester', async () => {
      setConfiguration(agentIdentifier, { session_replay: { errorSampleRate: 1, sampleRate: 0 } })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(sr.mode).toEqual(MODE.ERROR)
      expect(sr.scheduler.started).toEqual(false)
      sr.ee.emit('errorAgg')
      expect(sr.mode).toEqual(MODE.FULL)
      expect(sr.scheduler.started).toEqual(true)
      return
    })
  })

  describe('Session Replay Payload Validation', () => {
    test('Payload', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      const harvestContents = sr.getHarvestContents()
      // query attrs
      expect(harvestContents.qs).toMatchObject(anyQuery)

      expect(harvestContents.body).toEqual(expect.any(Array))

      expect(harvestContents.body.length).toBeGreaterThan(0)
    })
  })

  describe('Session Replay Harvest Behaviors', () => {
    test('Compressed payload is provided to harvester', async () => {
      const { gunzipSync, strFromU8 } = await import('fflate')
      setConfiguration(agentIdentifier, { ...init })
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      const [harvestContents] = sr.prepareHarvest()
      expect(harvestContents.qs).toMatchObject(anyQuery)
      expect(harvestContents.qs.attributes.includes('content_encoding=gzip')).toEqual(true)
      expect(harvestContents.body).toEqual(expect.any(Uint8Array))
      expect(JSON.parse(strFromU8(gunzipSync(harvestContents.body)))).toMatchObject(expect.any(Array))
    })

    test('Uncompressed payload is provided to harvester', async () => {
      jest.doMock('fflate', () => ({
        __esModule: true,
        gzipSync: jest.fn().mockImplementation(() => { throw new Error() })
      }))

      setConfiguration(agentIdentifier, { ...init })
      sr.shouldCompress = false
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)

      const [harvestContents] = sr.prepareHarvest()
      expect(harvestContents.qs).toMatchObject({
        protocol_version: '0',
        browser_monitoring_key: info.licenseKey
      })
      expect(harvestContents.qs.attributes.includes('content_encoding')).toEqual(false)
      expect(harvestContents.body).toEqual(expect.any(Array))
    })

    test('Clears the event buffer when staged for harvesting', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr.shouldCompress = false
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)

      sr.prepareHarvest()
      expect(sr.events.length).toEqual(0)
    })

    test('Harvests early if exceeds limit', async () => {
      let after = 0
      const spy = jest.spyOn(sr.scheduler, 'runHarvest').mockImplementation(() => { after = Date.now() })
      setConfiguration(agentIdentifier, { ...init })
      sr.payloadBytesEstimation = IDEAL_PAYLOAD_SIZE / AVG_COMPRESSION
      const before = Date.now()
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(spy).toHaveBeenCalled()
      expect(after - before).toBeLessThan(sr.harvestTimeSeconds * 1000)
    })

    test('Aborts if exceeds total limit', async () => {
      const spy = jest.spyOn(sr.scheduler, 'runHarvest')
      setConfiguration(agentIdentifier, { ...init })
      sr.payloadBytesEstimation = (MAX_PAYLOAD_SIZE + 1) / AVG_COMPRESSION
      const before = Date.now()
      sr.ee.emit('rumresp-sr', [true])
      await wait(1)
      expect(spy).not.toHaveBeenCalled()
      expect(sr.blocked).toEqual(true)
      expect(sr.mode).toEqual(MODE.OFF)
    })

    test('Aborts if 429 response', async () => {
      setConfiguration(agentIdentifier, { ...init })
      sr.ee.emit('rumresp-sr', [true])
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
  session = sess
  configure(agentIdentifier, { info, runtime: { session } }, 'test', true)
  sr = new SessionReplayAgg(agentIdentifier, new Aggregator({}))
}
