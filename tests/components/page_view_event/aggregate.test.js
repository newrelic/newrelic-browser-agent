import { setupAgent } from '../setup-agent'
import { Instrument as PageViewEvent } from '../../../src/features/page_view_event/instrument'

let mainAgent, pveAggregate

beforeAll(async () => {
  mainAgent = setupAgent()
  mainAgent.info.errorBeacon = undefined // this prevents Harvester from actually running its `send` method
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
    needResponse: true,
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
