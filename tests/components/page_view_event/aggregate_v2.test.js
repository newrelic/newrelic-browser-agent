import { setupAgent } from '../setup-agent'
import { Instrument as PageViewEvent } from '../../../src/features/page_view_event/instrument'
import * as sendModule from '../../../src/common/harvest/send'

describe('PageViewEvent aggregate v2', () => {
  test('uses harvest endpoint version 2', async () => {
    const agent = setupAgent({
      init: { feature_flags: ['rum_v2'] },
      runtime: {
        activatedFeatures: {},
        connector: {}
      }
    })

    const pveInst = new PageViewEvent(agent)
    await new Promise(process.nextTick)

    expect(pveInst.featAggregate.harvestEndpointVersion).toEqual(2)
  })

  test('only sends once consent is granted and harvester runs', async () => {
    const sendSpy = jest.spyOn(sendModule, 'send').mockImplementation(() => true)

    const agent = setupAgent({
      init: {
        feature_flags: ['rum_v2'],
        browser_consent_mode: { enabled: true }
      },
      runtime: {
        activatedFeatures: {},
        connector: {},
        consented: false
      }
    })
    agent.info.errorBeacon = 'fake-beacon'

    const pveInst = new PageViewEvent(agent)
    await new Promise(process.nextTick)
    const pveAggregate = pveInst.featAggregate

    // Ensure there is payload ready before we trigger harvest checks.
    pveAggregate.events.add({ ja: {} })

    expect(agent.runtime.harvester.triggerHarvestFor(pveAggregate).ranSend).toEqual(false)
    expect(sendSpy).not.toHaveBeenCalled()

    agent.runtime.consented = true

    expect(agent.runtime.harvester.triggerHarvestFor(pveAggregate).ranSend).toEqual(true)
    expect(sendSpy).toHaveBeenCalledTimes(1)

    sendSpy.mockRestore()
  })

  test('builds query timestamp from corrected origin time', async () => {
    const agent = setupAgent({
      init: { feature_flags: ['rum_v2'] },
      runtime: {
        activatedFeatures: {},
        connector: {}
      }
    })

    const pveInst = new PageViewEvent(agent)
    await new Promise(process.nextTick)
    const pveAggregate = pveInst.featAggregate

    const query = pveAggregate.queryStringsBuilder()
    expect(query.timestamp).toEqual(agent.runtime.timeKeeper.correctedOriginTime)
  })

  test('serializes only the first buffered payload entry', async () => {
    const agent = setupAgent({
      init: { feature_flags: ['rum_v2'] },
      runtime: {
        activatedFeatures: {},
        connector: {}
      }
    })

    const pveInst = new PageViewEvent(agent)
    await new Promise(process.nextTick)
    const pveAggregate = pveInst.featAggregate

    expect(pveAggregate.serializer([{ ja: { a: 1 } }, { ja: { b: 2 } }])).toEqual({ ja: { a: 1 } })
  })
})
