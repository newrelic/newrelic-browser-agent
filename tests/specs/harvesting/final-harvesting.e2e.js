import { supportsFetch, notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

// IE does not have reliable unload support
describe.withBrowsersMatching(notIE)('final harvesting', () => {
  it('should send final harvest when navigating away from page', async () => {
    await browser.url(await browser.testHandle.assetURL('final-harvest.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.pause(500)

    const finalHarvest = Promise.all([
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectMetrics(),
      browser.testHandle.expectErrors(),
      browser.testHandle.expectTrace(),
      browser.testHandle.expectIns()
    ])

    await browser.execute(function () {
      newrelic.noticeError(new Error('hippo hangry'))
      newrelic.addPageAction('DummyEvent', { free: 'tacos' })
    })

    await browser.url(await browser.testHandle.assetURL('/'))

    const [timingsResults, ajaxEventsResults, metricsResults, errorsResults, resourcesResults, pageActionResults] = await finalHarvest

    expect(timingsResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'unload',
        type: 'timing'
      })
    ]))
    expect(timingsResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'pageHide',
        type: 'timing'
      })
    ]))
    expect(ajaxEventsResults.request.body.length).toBeGreaterThan(0)
    expect(metricsResults.request.body.sm.length).toBeGreaterThan(0)
    expect(errorsResults.request.body.err).toEqual(expect.arrayContaining([
      expect.objectContaining({
        params: expect.objectContaining({
          message: 'hippo hangry'
        })
      })
    ]))
    expect(errorsResults.request.body.xhr.length).toBeGreaterThan(0)
    expect(resourcesResults.request.body.length).toBeGreaterThan(0)

    expect(pageActionResults.request.body.ins.length).toBeGreaterThan(0)
  })

  it.withBrowsersMatching(supportsFetch)('should use sendBeacon for unload harvests', async () => {
    await Promise.all([
      browser.testHandle.expectTimings(),
      browser.url(await browser.testHandle.assetURL('final-harvest.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    const finalHarvest = Promise.all([
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectMetrics(),
      browser.testHandle.expectErrors(),
      browser.testHandle.expectTrace(),
      browser.testHandle.expectIns()
    ])

    await browser.execute(function () {
      newrelic.noticeError(new Error('hippo hangry'))
      newrelic.addPageAction('DummyEvent', { free: 'tacos' })

      const sendBeaconFn = navigator.sendBeacon.bind(navigator)
      navigator.sendBeacon = function (url, body) {
        sendBeaconFn.call(navigator, url + '&sendBeacon=true', body)
      }
    })

    await browser.url(await browser.testHandle.assetURL('/'))

    const [timingsResults, ajaxEventsResults, metricsResults, errorsResults, resourcesResults, pageActionResults] = await finalHarvest

    expect(timingsResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'unload',
        type: 'timing'
      })
    ]))
    expect(timingsResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'pageHide',
        type: 'timing'
      })
    ]))
    expect(ajaxEventsResults.request.body.length).toBeGreaterThan(0)
    expect(metricsResults.request.body.sm.length).toBeGreaterThan(0)
    expect(errorsResults.request.body.err).toEqual(expect.arrayContaining([
      expect.objectContaining({
        params: expect.objectContaining({
          message: 'hippo hangry'
        })
      })
    ]))
    expect(errorsResults.request.body.xhr.length).toBeGreaterThan(0)
    expect(resourcesResults.request.body.length).toBeGreaterThan(0)

    expect(pageActionResults.request.body).toMatchObject({
      ins: [{ actionName: 'DummyEvent', free: 'tacos' }]
    })

    /*
    sendBeacon can be flakey so we check to see if at least one of the network
    calls used sendBeacon
    */
    const sendBeaconUsage = [
      timingsResults.request.query.sendBeacon,
      ajaxEventsResults.request.query.sendBeacon,
      metricsResults.request.query.sendBeacon,
      errorsResults.request.query.sendBeacon,
      resourcesResults.request.query.sendBeacon,
      pageActionResults.request.query.sendBeacon
    ]
    expect(sendBeaconUsage).toContain('true')
  })

  it('should not send pageHide event twice', async () => {
    await Promise.all([
      browser.testHandle.expectTimings(),
      browser.url(await browser.testHandle.assetURL('pagehide.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    await Promise.all([
      browser.testHandle.expectTimings(),
      $('#btn1').click()
    ])

    const [unloadTimings] = await Promise.all([
      browser.testHandle.expectTimings(),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    expect(unloadTimings.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'unload',
        type: 'timing'
      })
    ]))
    expect(unloadTimings.request.body).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'pageHide',
        type: 'timing'
      })
    ]))
  })

  it('should not send any final harvest when RUM fails, e.g. 400 code', async () => {
    let url = await browser.testHandle.assetURL('final-harvest.html')
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      statusCode: 400,
      body: '',
      permanent: true
    })

    let rumPromise = browser.testHandle.expectRum()
    await browser.url(url)
    await browser.waitUntil(() => browser.execute(async function () { return await Object.values(newrelic.initializedAgents)[0]?.features.page_view_event?.onAggregateImported }), { timeout: 15000 })

    // PVE feature should've fully imported and ran, with the RUM response coming back as the 400 we set. This should subsequently cause agent to not send anything else even at EoL.
    await expect(rumPromise).resolves.toEqual(expect.objectContaining({
      reply: expect.objectContaining({
        statusCode: 400,
        body: ''
      })
    }))

    let anyFollowingReq = browser.testHandle.expect('bamServer', {
      test: function () { return true },
      timeout: 5000,
      expectTimeout: true
    })
    await browser.url(await browser.testHandle.assetURL('/'))
    await expect(anyFollowingReq).resolves.toBeUndefined()
  })
})
