import { supportsFetch } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testAjaxEventsRequest, testBlobTraceRequest, testErrorsRequest, testInsRequest, testMetricsRequest, testRumRequest, testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('final harvesting', () => {
  let timingEventsCapture
  let ajaxEventsCapture
  let metricsCapture
  let errorsCapture
  let traceCapture
  let insightsCapture

  beforeEach(async () => {
    [timingEventsCapture, ajaxEventsCapture, metricsCapture, errorsCapture, traceCapture, insightsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testTimingEventsRequest },
      { test: testAjaxEventsRequest },
      { test: testMetricsRequest },
      { test: testErrorsRequest },
      { test: testBlobTraceRequest },
      { test: testInsRequest }
    ])
  })

  it('should send final harvest when navigating away from page', async () => {
    await browser.url(await browser.testHandle.assetURL('final-harvest.html'))
      .then(() => browser.waitForAgentLoad())

    const [timingEventsHarvests, ajaxEventsHarvests, metricsHarvests, errorsHarvests, traceHarvests, insightsHarvests] = await Promise.all([
      timingEventsCapture.waitForResult({ timeout: 5000 }),
      ajaxEventsCapture.waitForResult({ timeout: 5000 }),
      metricsCapture.waitForResult({ timeout: 5000 }),
      errorsCapture.waitForResult({ timeout: 5000 }),
      traceCapture.waitForResult({ timeout: 5000 }),
      insightsCapture.waitForResult({ timeout: 5000 }),
      browser.execute(function () {
        newrelic.noticeError(new Error('hippo hangry'))
        newrelic.addPageAction('DummyEvent', { free: 'tacos' })
      }).then(async () => browser.url(await browser.testHandle.assetURL('/')))
    ])

    // Timing does a double harvest on unload so we need to merge the requests
    const timingEventsFinalHarvest = timingEventsHarvests
      .flatMap(harvest => harvest.request.body)
    const [ajaxEventsFinalHarvest, metricsFinalHarvest, errorsFinalHarvest, traceFinalHarvest, insightsFinalHarvest] = [
      ajaxEventsHarvests[ajaxEventsHarvests.length - 1],
      metricsHarvests[metricsHarvests.length - 1],
      errorsHarvests[errorsHarvests.length - 1],
      traceHarvests[traceHarvests.length - 1],
      insightsHarvests[insightsHarvests.length - 1]
    ]

    expect(timingEventsFinalHarvest).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'unload',
        type: 'timing'
      })
    ]))
    expect(timingEventsFinalHarvest).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'pageHide',
        type: 'timing'
      })
    ]))
    expect(ajaxEventsFinalHarvest.request.body.length).toBeGreaterThan(0)
    expect(metricsFinalHarvest.request.body.sm.length).toBeGreaterThan(0)
    expect(errorsFinalHarvest.request.body.err).toEqual(expect.arrayContaining([
      expect.objectContaining({
        params: expect.objectContaining({
          message: 'hippo hangry'
        })
      })
    ]))
    expect(errorsFinalHarvest.request.body.xhr.length).toBeGreaterThan(0)
    expect(traceFinalHarvest.request.body.length).toBeGreaterThan(0)
    expect(insightsFinalHarvest.request.body.ins.length).toBeGreaterThan(0)
  })

  it.withBrowsersMatching(supportsFetch)('should use sendBeacon for unload harvests', async () => {
    await browser.url(await browser.testHandle.assetURL('final-harvest.html'))
      .then(() => browser.waitForAgentLoad())

    const [timingEventsHarvests, ajaxEventsHarvests, metricsHarvests, errorsHarvests, traceHarvests, insightsHarvests] = await Promise.all([
      timingEventsCapture.waitForResult({ timeout: 5000 }),
      ajaxEventsCapture.waitForResult({ timeout: 5000 }),
      metricsCapture.waitForResult({ timeout: 5000 }),
      errorsCapture.waitForResult({ timeout: 5000 }),
      traceCapture.waitForResult({ timeout: 5000 }),
      insightsCapture.waitForResult({ timeout: 5000 }),
      browser.execute(function () {
        newrelic.noticeError(new Error('hippo hangry'))
        newrelic.addPageAction('DummyEvent', { free: 'tacos' })

        var sendBeaconFn = navigator.sendBeacon.bind(navigator)
        navigator.sendBeacon = function (url, body) {
          sendBeaconFn.call(navigator, url + '&sendBeacon=true', body)
        }
      }).then(async () => browser.url(await browser.testHandle.assetURL('/')))
    ])

    // Timing does a double harvest on unload so we need to merge the requests
    const timingEventsFinalHarvest = timingEventsHarvests
      .flatMap(harvest => harvest.request.body)
    const [ajaxEventsFinalHarvest, metricsFinalHarvest, errorsFinalHarvest, traceFinalHarvest, insightsFinalHarvest] = [
      ajaxEventsHarvests[ajaxEventsHarvests.length - 1],
      metricsHarvests[metricsHarvests.length - 1],
      errorsHarvests[errorsHarvests.length - 1],
      traceHarvests[traceHarvests.length - 1],
      insightsHarvests[insightsHarvests.length - 1]
    ]

    expect(timingEventsFinalHarvest).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'unload',
        type: 'timing'
      })
    ]))
    expect(timingEventsFinalHarvest).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'pageHide',
        type: 'timing'
      })
    ]))
    expect(ajaxEventsFinalHarvest.request.body.length).toBeGreaterThan(0)
    expect(metricsFinalHarvest.request.body.sm.length).toBeGreaterThan(0)
    expect(errorsFinalHarvest.request.body.err).toEqual(expect.arrayContaining([
      expect.objectContaining({
        params: expect.objectContaining({
          message: 'hippo hangry'
        })
      })
    ]))
    expect(errorsFinalHarvest.request.body.xhr.length).toBeGreaterThan(0)
    expect(traceFinalHarvest.request.body.length).toBeGreaterThan(0)
    expect(insightsFinalHarvest.request.body).toMatchObject({
      ins: [{ actionName: 'DummyEvent', free: 'tacos' }]
    })

    /*
    sendBeacon can be flakey so we check to see if at least one of the network
    calls used sendBeacon
    */
    const sendBeaconUsage = [
      timingEventsHarvests[timingEventsHarvests.length - 1].request.query.sendBeacon,
      ajaxEventsFinalHarvest.request.query.sendBeacon,
      metricsFinalHarvest.request.query.sendBeacon,
      errorsFinalHarvest.request.query.sendBeacon,
      traceFinalHarvest.request.query.sendBeacon,
      insightsFinalHarvest.request.query.sendBeacon
    ]
    expect(sendBeaconUsage).toContain('true')
  })

  it('should not send pageHide event twice', async () => {
    await browser.url(await browser.testHandle.assetURL('pagehide.html'))
      .then(() => browser.waitForAgentLoad())

    await Promise.all([
      timingEventsCapture.waitForResult({ timeout: 5000 }),
      $('#btn1').click()
    ])

    const [timingEventsHarvests] = await Promise.all([
      timingEventsCapture.waitForResult({ timeout: 5000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    const pageHideTimingEvents = timingEventsHarvests
      .flatMap(harvest => harvest.request.body)
      .filter(event => event.name === 'pageHide')

    expect(pageHideTimingEvents.length).toEqual(1)
  })

  it('should not send any final harvest when RUM fails, e.g. 400 code', async () => {
    // Capture all BAM requests
    const bamCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
      test: function () {
        return true
      }
    })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      statusCode: 400,
      body: '',
      permanent: true
    })

    const [bamHarvests] = await Promise.all([
      bamCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('final-harvest.html'))
        .then(() => browser.waitUntil(
          () => browser.execute(function () {
            return Object.values(newrelic.initializedAgents)[0]?.ee.aborted
          }),
          15000
        ))
        .then(() => browser.pause(1000))
        .then(async () => browser.url(await browser.testHandle.assetURL('/')))
    ])

    expect(bamHarvests.length).toEqual(1)
    expect(bamHarvests[0].reply).toEqual(expect.objectContaining({
      statusCode: 400,
      body: ''
    }))
  })
})
