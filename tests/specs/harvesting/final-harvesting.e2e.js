import { supportsFetch, reliableUnload } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('final harvesting', () => {
  withBrowsersMatching(reliableUnload)('should send final harvest when navigating away from page', async () => {
    await browser.url(await browser.testHandle.assetURL('final-harvest.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.pause(500)

    const finalHarvest = Promise.all([
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectMetrics(),
      browser.testHandle.expectErrors(),
      browser.testHandle.expectResources()
    ])

    await browser.execute(function () {
      newrelic.noticeError(new Error('hippo hangry'))
      newrelic.addPageAction('DummyEvent', { free: 'tacos' })
    })

    await browser.url(await browser.testHandle.assetURL('/'))

    const [timingsResults, ajaxEventsResults, metricsResults, errorsResults, resourcesResults] = await finalHarvest

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
    expect(resourcesResults.request.body.res.length).toBeGreaterThan(0)
  })

  withBrowsersMatching(supportsFetch)('should use sendBeacon for unload harvests', async () => {
    await browser.url(await browser.testHandle.assetURL('final-harvest.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.pause(500)

    const finalHarvest = Promise.all([
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectMetrics(),
      browser.testHandle.expectErrors(),
      browser.testHandle.expectResources()
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

    const [timingsResults, ajaxEventsResults, metricsResults, errorsResults, resourcesResults] = await finalHarvest

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
    expect(resourcesResults.request.body.res.length).toBeGreaterThan(0)

    /*
    sendBeacon can be flakey so we check to see if at least one of the network
    calls used sendBeacon
    */
    const sendBeaconUsage = [
      timingsResults.request.query.sendBeacon,
      ajaxEventsResults.request.query.sendBeacon,
      metricsResults.request.query.sendBeacon,
      errorsResults.request.query.sendBeacon,
      resourcesResults.request.query.sendBeacon
    ]
    expect(sendBeaconUsage).toContain('true')
  })

  withBrowsersMatching(supportsFetch)('should use fetch with keepalive when sendBeacon returns false', async () => {
    await browser.url(await browser.testHandle.assetURL('final-harvest.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.pause(500)

    const finalHarvest = Promise.all([
      browser.testHandle.expectTimings(),
      browser.testHandle.expectAjaxEvents(),
      browser.testHandle.expectMetrics(),
      browser.testHandle.expectErrors(),
      browser.testHandle.expectResources()
    ])

    await browser.execute(function () {
      newrelic.noticeError(new Error('hippo hangry'))
      newrelic.addPageAction('DummyEvent', { free: 'tacos' })

      navigator.sendBeacon = function () {
        return false
      }
    })

    await browser.url(await browser.testHandle.assetURL('/'))

    const [timingsResults, ajaxEventsResults, metricsResults, errorsResults, resourcesResults] = await finalHarvest

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
    expect(resourcesResults.request.body.res.length).toBeGreaterThan(0)
  })

  withBrowsersMatching(reliableUnload)('should not send pageHide event twice', async () => {
    await browser.url(await browser.testHandle.assetURL('pagehide.html'))
      .then(() => browser.waitForAgentLoad())

    await browser.pause(500)

    await $('#btn1').click()

    const timingsPromise = browser.testHandle.expectTimings()

    await browser.url(await browser.testHandle.assetURL('/'))

    const timingsResults = await timingsPromise

    expect(timingsResults.request.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'unload',
        type: 'timing'
      })
    ]))
    expect(timingsResults.request.body).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'pageHide',
        type: 'timing'
      })
    ]))
  })
})
