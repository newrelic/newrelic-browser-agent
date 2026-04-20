import { setupAgent } from '../setup-agent'
import { Instrument as PageViewEvent } from '../../../src/features/page_view_event/instrument'
import * as sendModule from '../../../src/common/harvest/send'
import { TextEncoder } from 'util'

let mainAgent, pveAggregate

beforeAll(async () => {
  mainAgent = setupAgent()
  mainAgent.info.errorBeacon = 'fake-beacon' // Set a dummy value so send() logic runs (but submitMethod will be mocked to prevent actual network calls)
})
beforeEach(async () => {
  const pveInstrument = new PageViewEvent(mainAgent)
  await new Promise(process.nextTick)
  pveAggregate = pveInstrument.featAggregate
})

test('PageViewEvent does not throw on Harvester driven processes', () => {
  expect(pveAggregate.blocked).toEqual(false)
  expect(() => pveAggregate.makeHarvestPayload(true)).not.toThrow()

  // The following both don't send anything since PVE buffer is meant to stay empty, so they return false.
  expect(mainAgent.runtime.harvester.triggerHarvestFor(pveAggregate).ranSend).toEqual(false) // mimics what the harvester does on interval
  expect(mainAgent.runtime.harvester.triggerHarvestFor(pveAggregate, { isFinalHarvest: true }).ranSend).toEqual(false) // mimics what the harvester does on EoL

  pveAggregate.events.add(undefined) // ensure request even if sendRum() puts empty body into buffer
  expect(mainAgent.runtime.harvester.triggerHarvestFor(pveAggregate, {
    sendEmptyBody: true
  }).ranSend).toEqual(true) // mimics the manual trigger in PVE `sendRum`; this should return true as it actually tries to "send"
})

test('PageViewEvent reports SM on invalid timestamp', () => {
  const spy = jest.spyOn(pveAggregate, 'reportSupportabilityMetric')
  jest.useFakeTimers()

  mainAgent.runtime.timeKeeper.processRumRequest(undefined, 0, 2, Date.now() + 20000)
  expect(mainAgent.runtime.timeKeeper.ready).toEqual(true)

  const originTime = mainAgent.runtime.timeKeeper.correctedOriginTime
  pveAggregate.postHarvestCleanup({
    status: 200,
    responseText: JSON.stringify({
      app: {
        agents: [{ entityGuid: 'Mjk0MjgxMXxCUk9XU0VSfEFQUExJQ0FUSU9OfDQwNzUwNDQ3NQ' }],
        // agent's timestamp is in the future, so it is invalid
        nrServerTime: originTime - 10000
      }
    }),
    xhr: { status: 200 },
    targetApp: undefined
  })

  expect(spy).toHaveBeenCalledWith('Generic/TimeKeeper/InvalidTimestamp/Seen', 10000)

  jest.useRealTimers()
  spy.mockRestore()
})

test('PageViewEvent does not report SM on valid timestamp', () => {
  const spy = jest.spyOn(pveAggregate, 'reportSupportabilityMetric')
  jest.useFakeTimers()

  mainAgent.runtime.timeKeeper.processRumRequest(undefined, 0, 2, Date.now() + 20000)
  expect(mainAgent.runtime.timeKeeper.ready).toEqual(true)

  const originTime = mainAgent.runtime.timeKeeper.correctedOriginTime
  pveAggregate.postHarvestCleanup({
    status: 200,
    responseText: JSON.stringify({
      app: {
        agents: [{ entityGuid: 'Mjk0MjgxMXxCUk9XU0VSfEFQUExJQ0FUSU9OfDQwNzUwNDQ3NQ' }],
        // agent's timestamp is in the past, so it is valid
        nrServerTime: originTime + 10000
      }
    }),
    xhr: { status: 200 },
    targetApp: undefined
  })

  expect(spy).not.toHaveBeenCalled()

  jest.useRealTimers()
  spy.mockRestore()
})

describe('RUM call', () => {
  let testAgent, pveAgg
  let sendSpy
  let featFlags
  let someServerTime
  beforeEach(async () => {
    // Mock TextEncoder for Node.js environment
    global.TextEncoder = TextEncoder

    sendSpy = jest.spyOn(sendModule, 'send')

    testAgent = setupAgent()
    testAgent.info.errorBeacon = 'fake-beacon' // Required for send() to execute

    const pveInst = new PageViewEvent(testAgent)
    await new Promise(process.nextTick)
    pveAgg = pveInst.featAggregate

    featFlags = { err: 1, ins: 1, log: 1, logapi: 1, spa: 1, sr: 1, srs: 1, st: 1, sts: 1 }
    someServerTime = Date.now() + 10000
  })

  afterEach(() => {
    sendSpy.mockRestore()
    global.TextEncoder = undefined
  })

  test('sends fsh = 1, when no cached response is present', () => {
    testAgent.runtime.session.isNew = false
    testAgent.runtime.session.state.cachedRumResponse = undefined

    pveAgg.sendRum()

    const actualQueryString = sendSpy.mock.calls[0][1].payload.qs
    expect(actualQueryString).toEqual(
      expect.objectContaining({ fsh: 1 })
    )
  })

  test('sends fsh = 0, when cached response is present', () => {
    testAgent.runtime.session.isNew = true
    testAgent.runtime.session.state.cachedRumResponse = { ...featFlags }

    pveAgg.sendRum()

    const actualQueryString = sendSpy.mock.calls[0][1].payload.qs
    expect(actualQueryString).toEqual(
      expect.objectContaining({ fsh: 0 })
    )
  })

  test('caches response when RUM call succeeds and no cached response is present yet', () => {
    testAgent.runtime.session.state.cachedRumResponse = undefined

    sendSpy.mockImplementation((agentRef, { cbFinished }) => {
      if (cbFinished) {
        const mockResult = {
          sent: true,
          status: 200,
          retry: false,
          fullUrl: 'https://fake-beacon/rum/1/license-key',
          xhr: { status: 200 },
          responseText: JSON.stringify({
            app: {
              agents: [{ entityGuid: 'test-guid' }],
              nrServerTime: someServerTime
            },
            ...featFlags
          })
        }

        // Call the callback to trigger postHarvestCleanup
        cbFinished(mockResult)
      }
      return true
    })

    pveAgg.sendRum()

    // Assert: Response flags should be cached (everything except 'app')
    expect(testAgent.runtime.session.state.cachedRumResponse).toEqual({
      err: 1,
      ins: 1,
      log: 1,
      logapi: 1,
      spa: 1,
      sr: 1,
      srs: 1,
      st: 1,
      sts: 1
    })
    expect(testAgent.runtime.session.state.cachedRumResponse.app).toBeUndefined()
  })

  test('does not cache response when RUM call fails', () => {
    testAgent.runtime.session.state.cachedRumResponse = undefined

    sendSpy.mockImplementation((agentRef, { cbFinished }) => {
      if (cbFinished) {
        const mockResult = {
          sent: true,
          status: 400,
          retry: false,
          fullUrl: 'https://fake-beacon/rum/1/license-key',
          xhr: { status: 400 },
          responseText: ''
        }

        cbFinished(mockResult)
      }
      return true
    })

    pveAgg.sendRum()

    expect(testAgent.runtime.session.state.cachedRumResponse).toBeUndefined()
  })

  test('does not remove old cached response when new PVE/RUM call fails', () => {
    testAgent.runtime.session.state.cachedRumResponse = featFlags

    sendSpy.mockImplementation((agentRef, { cbFinished }) => {
      if (cbFinished) {
        const mockResult = {
          sent: true,
          status: 400,
          retry: false,
          fullUrl: 'https://fake-beacon/rum/1/license-key',
          xhr: { status: 400 },
          responseText: ''
        }

        cbFinished(mockResult)
      }
      return true
    })

    pveAgg.sendRum()

    expect(testAgent.runtime.session.state.cachedRumResponse).toBe(featFlags)
  })

  test('does not cache response when cached response is already present', () => {
    testAgent.runtime.session.state.cachedRumResponse = featFlags

    sendSpy.mockImplementation((agentRef, { cbFinished }) => {
      if (cbFinished) {
        const mockResult = {
          sent: true,
          status: 200,
          retry: false,
          fullUrl: 'https://fake-beacon/rum/1/license-key',
          xhr: { status: 200 },
          responseText: JSON.stringify({
            app: {
              agents: [{ entityGuid: 'test-guid' }],
              nrServerTime: someServerTime
            },
            err: 0,
            ins: 0,
            log: 0,
            logapi: 0,
            spa: 0,
            sr: 0,
            srs: 0,
            st: 0,
            sts: 0
          })
        }

        cbFinished(mockResult)
      }
      return true
    })

    pveAgg.sendRum()

    expect(testAgent.runtime.session.state.cachedRumResponse).toBe(featFlags)
  })

  test('passes cached response to activate features, even when PVE/RUM call fails', () => {
    testAgent.runtime.session.state.cachedRumResponse = featFlags

    sendSpy.mockImplementation((agentRef, { cbFinished }) => {
      if (cbFinished) {
        const mockResult = {
          sent: true,
          status: 200,
          retry: false,
          fullUrl: 'https://fake-beacon/rum/1/license-key',
          xhr: { status: 200 },
          responseText: JSON.stringify({
            app: {
              agents: [{ entityGuid: 'test-guid' }],
              nrServerTime: someServerTime
            },
            err: 0,
            ins: 0,
            log: 0,
            logapi: 0,
            spa: 0,
            sr: 0,
            srs: 0,
            st: 0,
            sts: 0
          })
        }

        cbFinished(mockResult)
      }
      return true
    })

    pveAgg.sendRum()

    const rumrespArg = testAgent.ee.emit.mock.calls.find(call => call[0] === 'rumresp')[1][0]

    expect(rumrespArg).toEqual(featFlags)
  })
})
