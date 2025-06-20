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

  expect(mainAgent.runtime.harvester.triggerHarvestFor(pveAggregate, {
    directSend: {
      payload: 'blah'
    },
    needResponse: true,
    sendEmptyBody: true
  }).ranSend).toEqual(true) // mimics the manual trigger in PVE `sendRum`; this should return true as it actually tries to "send"
})
