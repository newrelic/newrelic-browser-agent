import { setupAgent } from '../setup-agent'
import { Instrument as PageViewEvent } from '../../../src/features/page_view_event/instrument'
import * as sendModule from '../../../src/common/harvest/send'
import { CONNECT } from '../../../src/loaders/features/features'

describe('PageViewEvent aggregate v2', () => {
  test('uses harvest endpoint version 2', async () => {
    const agent = setupAgent({
      init: { feature_flags: ['rum_v2'] },
      runtime: {
        activatedFeatures: {}
      }
    })

    const pveInst = new PageViewEvent(agent)
    await new Promise(process.nextTick)

    expect(pveInst.featAggregate.harvestEndpointVersion).toEqual(2)
  })

  test('only sends telemetry once consent is granted and harvester runs', async () => {
    const sendSpy = jest.spyOn(sendModule, 'send').mockImplementation(() => true)

    const agent = setupAgent({
      init: {
        feature_flags: ['rum_v2'],
        browser_consent_mode: { enabled: true }
      },
      runtime: {
        activatedFeatures: {},
        consented: false
      }
    })
    agent.info.errorBeacon = 'fake-beacon'

    const pveInst = new PageViewEvent(agent)
    await new Promise(process.nextTick)
    const pveAggregate = pveInst.featAggregate

    // Ensure there is payload ready before we trigger harvest checks.
    pveAggregate.events.add({ ja: {} })

    // The rum_v2 Connector fires its own connect request during bootstrap; only the harvest calls below are under test.
    sendSpy.mockClear()

    expect(agent.runtime.harvester.triggerHarvestFor(pveAggregate).ranSend).toEqual(false)
    expect(sendSpy).not.toHaveBeenCalled()

    agent.runtime.consented = true

    expect(agent.runtime.harvester.triggerHarvestFor(pveAggregate).ranSend).toEqual(true)
    expect(sendSpy).toHaveBeenCalledTimes(1)

    sendSpy.mockRestore()
  })

  test('forwards igp from the connect response as a query param on the v2 PageView harvest', async () => {
    const sendSpy = jest.spyOn(sendModule, 'send').mockImplementation(() => true)

    const agent = setupAgent({
      init: { feature_flags: ['rum_v2'] },
      runtime: {
        activatedFeatures: {},
        appMetadata: {} // clear setupAgent's default so Connector's guard actually applies the connect response below
      }
    })
    agent.info.errorBeacon = 'fake-beacon'

    const pveInst = new PageViewEvent(agent)
    await new Promise(process.nextTick)
    const pveAggregate = pveInst.featAggregate

    const connectCall = sendSpy.mock.calls.find(call => call[1].featureName === CONNECT)
    connectCall[1].cbFinished({
      sent: true,
      status: 200,
      retry: false,
      xhr: { status: 200 },
      responseText: JSON.stringify({
        app: { agents: [{ entityGuid: 'guid' }], nrServerTime: Date.now(), igp: 'opaque-igp-token' },
        config: {}
      })
    })

    expect(pveAggregate.queryStringsBuilder().igp).toEqual('opaque-igp-token')

    sendSpy.mockRestore()
  })

  test('outgoing v2 PageView harvest XHR URL includes the igp forwarded from connect', async () => {
    // Let `send()` run for real so it builds the actual URL; only stub the actual network dispatch (`.send()`).
    // `.open()` is left to run for real -- jsdom's XHR requires it to have actually run before `setRequestHeader` is called.
    const openSpy = jest.spyOn(XMLHttpRequest.prototype, 'open')
    jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {})
    const sendSpy = jest.spyOn(sendModule, 'send')

    const agent = setupAgent({
      init: { feature_flags: ['rum_v2'] },
      runtime: {
        activatedFeatures: {},
        appMetadata: {} // clear setupAgent's default so Connector's guard actually applies the connect response below
      }
    })
    agent.info.errorBeacon = 'fake-beacon'

    const pveInst = new PageViewEvent(agent)
    await new Promise(process.nextTick)
    const pveAggregate = pveInst.featAggregate

    const connectCall = sendSpy.mock.calls.find(call => call[1].featureName === CONNECT)
    connectCall[1].cbFinished({
      sent: true,
      status: 200,
      retry: false,
      xhr: { status: 200 },
      responseText: JSON.stringify({
        app: { agents: [{ entityGuid: 'guid' }], nrServerTime: Date.now(), igp: 'opaque-igp-token' },
        config: {}
      })
    })

    pveAggregate.events.add({ ja: {} })
    agent.runtime.harvester.triggerHarvestFor(pveAggregate)

    const harvestUrl = openSpy.mock.calls.map(call => call[1]).find(url => url.includes('/rum/2/'))
    expect(harvestUrl).toContain('igp=opaque-igp-token')

    openSpy.mockRestore()
    XMLHttpRequest.prototype.send.mockRestore()
    sendSpy.mockRestore()
  })

  test('builds query timestamp from corrected origin time', async () => {
    const agent = setupAgent({
      init: { feature_flags: ['rum_v2'] },
      runtime: {
        activatedFeatures: {}
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
        activatedFeatures: {}
      }
    })

    const pveInst = new PageViewEvent(agent)
    await new Promise(process.nextTick)
    const pveAggregate = pveInst.featAggregate

    expect(pveAggregate.serializer([{ ja: { a: 1 } }, { ja: { b: 2 } }])).toEqual({ ja: { a: 1 } })
  })
})
