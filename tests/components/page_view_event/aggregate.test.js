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
    testAgent.runtime.session.isNew = true // ensure old logic is not taking effect
    testAgent.runtime.session.state.cachedRumResponse = { ...featFlags }

    pveAgg.sendRum()

    const actualQueryString = sendSpy.mock.calls[0][1].payload.qs
    expect(actualQueryString).toEqual(
      expect.objectContaining({ fsh: 0 })
    )
  })

  describe('when cached response is not present yet', () => {
    test('caches response when RUM call succeeds', () => {
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

      // Assert: Response flags should be cached, including app
      expect(testAgent.runtime.session.state.cachedRumResponse).toEqual({
        app: {
          agents: [{ entityGuid: 'test-guid' }],
          nrServerTime: someServerTime
        },
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
  })

  describe('when cached response is present', () => {
    test('does not overwrite cached response when new PVE/RUM call succeeds', () => {
      testAgent.runtime.session.state.cachedRumResponse = {
        app: {
          agents: [{ entityGuid: 'test-guid' }],
          nrServerTime: someServerTime
        },
        ...featFlags
      }

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

      expect(testAgent.runtime.session.state.cachedRumResponse).toEqual({
        app: {
          agents: [{ entityGuid: 'test-guid' }],
          nrServerTime: someServerTime
        },
        ...featFlags
      })
    })

    describe('and new PVE/RUM call fails', () => {
      let mockSessionEntity
      beforeEach(async () => {
        mockSessionEntity = {
          read: () => {
            return {
              serverTimeDiff: -1000,
              app: {
                agents: [{ entityGuid: 'test-guid' }],
                nrServerTime: someServerTime
              }
            }
          },
          serverTimeDiff: -1234,
          state: {
            cachedRumResponse: {
              app: {
                agents: [{ entityGuid: 'test-guid' }],
                nrServerTime: someServerTime
              },
              ...featFlags
            }
          }
        }

        testAgent = setupAgent({ runtime: { session: mockSessionEntity } })
        testAgent.info.errorBeacon = 'fake-beacon' // Required for send() to execute

        const pveInst = new PageViewEvent(testAgent)
        await new Promise(process.nextTick)
        pveAgg = pveInst.featAggregate
      })
      afterEach(() => {
        testAgent = undefined
        mockSessionEntity = undefined
      })
      test('does not remove old cached response', () => {
        sendSpy.mockImplementation((agentRef, { cbFinished }) => {
          if (cbFinished) {
            const mockResult = {
              sent: true,
              status: 400,
              retry: true,
              fullUrl: 'https://fake-beacon/rum/1/license-key',
              xhr: { status: 400 },
              responseText: ''
            }

            cbFinished(mockResult)
          }
          return true
        })

        pveAgg.sendRum()

        expect(testAgent.runtime.session.state.cachedRumResponse).toEqual({
          app: {
            agents: [{ entityGuid: 'test-guid' }],
            nrServerTime: someServerTime
          },
          ...featFlags
        })
      })

      test('does not block PVE', () => {
        sendSpy.mockImplementation((agentRef, { cbFinished }) => {
          if (cbFinished) {
            cbFinished({
              sent: true,
              status: 400,
              retry: true,
              xhr: { status: 400 },
              responseText: ''
            })
          }
          return true
        })

        pveAgg.sendRum()

        expect(pveAgg.blocked).toEqual(false)
      })

      test('does not send Dropped/Bytes SM', () => {
        sendSpy.mockImplementation((agentRef, { cbFinished }) => {
          if (cbFinished) {
            cbFinished({
              sent: true,
              status: 400,
              retry: true,
              xhr: { status: 400 },
              responseText: ''
            })
          }
          return true
        })

        pveAgg.sendRum()

        const smSendCalls = sendSpy.mock.calls.filter(call => call[1].payload?.body?.sm)
        const hasDroppedBytesSM = smSendCalls.some(call =>
          call[1].payload.body.sm.some(item => item.params.name.includes('Dropped/Bytes'))
        )
        expect(hasDroppedBytesSM).toEqual(false)
      })

      test('does not retry RUM call', () => {
        jest.useFakeTimers()

        const triggerHarvestSpy = jest.spyOn(testAgent.runtime.harvester, 'triggerHarvestFor')

        sendSpy.mockImplementation((agentRef, { cbFinished }) => {
          if (cbFinished) {
            cbFinished({
              sent: true,
              status: 400,
              retry: true,
              xhr: { status: 400 },
              responseText: ''
            })
          }
          return true
        })

        pveAgg.sendRum()

        expect(pveAgg.isRetrying).toEqual(false)
        expect(pveAgg.retries).toEqual(0)

        jest.advanceTimersByTime(5001) // past the 5-second retry window
        expect(triggerHarvestSpy).toHaveBeenCalledTimes(2) // second call is from the first harvest after drain

        jest.useRealTimers()
        triggerHarvestSpy.mockRestore()
      })

      test('sets appMetadata from cached response', () => {
        testAgent.runtime.appMetadata = {}
        sendSpy.mockImplementation((agentRef, { cbFinished }) => {
          if (cbFinished) {
            cbFinished({
              sent: true,
              status: 400,
              retry: true,
              xhr: { status: 400 },
              responseText: ''
            })
          }
          return true
        })

        pveAgg.sendRum()

        expect(testAgent.runtime.appMetadata).toEqual({
          agents: [{ entityGuid: 'test-guid' }],
          nrServerTime: someServerTime
        })
      })

      test('passes cached response to activate features', () => {
        testAgent.runtime.session.state.cachedRumResponse = featFlags

        sendSpy.mockImplementation((agentRef, { cbFinished }) => {
          if (cbFinished) {
            const mockResult = {
              sent: true,
              status: 200,
              retry: true,
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
  })

  // this is the scenario where the session is disabled (e.g. cookies are off) so there is no place to cache the response, but we still want to activate features based on the RUM response flags
  test('passes flags to activate features, when session is not present', async () => {
    const noSessionAgent = setupAgent({ init: { privacy: { cookies_enabled: false } } })
    noSessionAgent.info.errorBeacon = 'fake-beacon'
    const pveInst = new PageViewEvent(noSessionAgent)
    await new Promise(process.nextTick)
    const noSessionAgg = pveInst.featAggregate

    sendSpy.mockImplementation((agentRef, { cbFinished }) => {
      if (cbFinished) {
        cbFinished({
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
        })
      }
      return true
    })

    expect(() => noSessionAgg.sendRum()).not.toThrow()

    const rumrespArg = noSessionAgent.ee.emit.mock.calls.find(call => call[0] === 'rumresp')[1][0]
    expect(rumrespArg).toEqual(featFlags)
  })

  test('does not include fsh in RUM query params when session is not present', async () => {
    const noSessionAgent = setupAgent({ init: { privacy: { cookies_enabled: false } } })
    noSessionAgent.info.errorBeacon = 'fake-beacon'
    const pveInst = new PageViewEvent(noSessionAgent)
    await new Promise(process.nextTick)
    const noSessionAgg = pveInst.featAggregate

    noSessionAgg.sendRum()

    const actualQueryString = sendSpy.mock.calls[0][1].payload.qs
    expect(actualQueryString).not.toHaveProperty('fsh')
  })

  test('cachedRumResponse survives session onPause write triggered by page visibility change', () => {
    testAgent.runtime.session.state.cachedRumResponse = undefined

    sendSpy.mockImplementation((agentRef, { cbFinished }) => {
      if (cbFinished) {
        cbFinished({
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
        })
      }
      return true
    })

    pveAgg.sendRum()

    const expectedCachedResponse = {
      app: {
        agents: [{ entityGuid: 'test-guid' }],
        nrServerTime: someServerTime
      },
      ...featFlags
    }
    expect(testAgent.runtime.session.state.cachedRumResponse).toEqual(expectedCachedResponse)

    // Simulate the onPause that fires when the page becomes hidden (e.g. during navigation).
    testAgent.runtime.session.inactiveTimer.pause()

    expect(testAgent.runtime.session.state.cachedRumResponse).toEqual(expectedCachedResponse)
    expect(testAgent.runtime.session.read().cachedRumResponse).toEqual(expectedCachedResponse)
  })

  test('cachedRumResponse is stored separately for multiple apps', async () => {
    testAgent.runtime.session.state.cachedRumResponse = undefined

    const testAgent2 = setupAgent()
    testAgent2.info.errorBeacon = 'fake-beacon'
    const pveInst2 = new PageViewEvent(testAgent2)
    await new Promise(process.nextTick)
    const pveAgg2 = pveInst2.featAggregate
    testAgent2.runtime.session.state.cachedRumResponse = undefined

    const featFlags1 = { err: 1, ins: 1, log: 1, logapi: 1, spa: 1, sr: 1, srs: 1, st: 1, sts: 1 }
    const featFlags2 = { err: 0, ins: 0, log: 2, logapi: 2, spa: 0, sr: 0, srs: 0, st: 0, sts: 0 }

    sendSpy.mockImplementation((agentRef, { cbFinished }) => {
      if (cbFinished) {
        const flags = agentRef.agentIdentifier === testAgent.agentIdentifier ? featFlags1 : featFlags2
        const app = agentRef.agentIdentifier === testAgent.agentIdentifier ? { agents: [{ entityGuid: 'test-guid-1' }], nrServerTime: someServerTime } : { agents: [{ entityGuid: 'test-guid-2' }], nrServerTime: someServerTime }
        cbFinished({
          sent: true,
          status: 200,
          retry: false,
          fullUrl: 'https://fake-beacon/rum/1/license-key',
          xhr: { status: 200 },
          responseText: JSON.stringify({ app, ...flags })
        })
      }
      return true
    })

    pveAgg.sendRum()
    pveAgg2.sendRum()

    // Each agent's session uses a unique lookupKey (keyed by applicationID + licenseKey)
    expect(testAgent.runtime.session.lookupKey).not.toEqual(testAgent2.runtime.session.lookupKey)

    // Agent 1 only sees its own cached response
    expect(testAgent.runtime.session.state.cachedRumResponse).toEqual({
      app: { agents: [{ entityGuid: 'test-guid-1' }], nrServerTime: someServerTime },
      ...featFlags1
    })
    expect(testAgent.runtime.session.read().cachedRumResponse).toEqual({
      app: { agents: [{ entityGuid: 'test-guid-1' }], nrServerTime: someServerTime },
      ...featFlags1
    })

    // Agent 2 only sees its own cached response
    expect(testAgent2.runtime.session.state.cachedRumResponse).toEqual({
      app: { agents: [{ entityGuid: 'test-guid-2' }], nrServerTime: someServerTime },
      ...featFlags2
    })
    expect(testAgent2.runtime.session.read().cachedRumResponse).toEqual({
      app: { agents: [{ entityGuid: 'test-guid-2' }], nrServerTime: someServerTime },
      ...featFlags2
    })
  })
})
