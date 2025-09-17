import { testAjaxEventsRequest, testInsRequest, testInteractionEventsRequest, testLogsRequest, testMetricsRequest, testBlobTraceRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('should harvest early', () => {
  let ajaxEventsCapture
  let insightsCapture
  let interactionEventsCapture
  let loggingEventsCapture
  let metricsCapture
  let testBlobTraceCapture

  beforeEach(async () => {
    [ajaxEventsCapture, insightsCapture, interactionEventsCapture, loggingEventsCapture, metricsCapture, testBlobTraceCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testAjaxEventsRequest },
      { test: testInsRequest },
      { test: testInteractionEventsRequest },
      { test: testLogsRequest },
      { test: testMetricsRequest },
      { test: testBlobTraceRequest }
    ])
  })

  it('should harvest early when exceeding ideal size', async () => {
    const timeStart = Date.now()
    await browser.url(await browser.testHandle.assetURL('harvest-early-block-internal.html'))
      .then(() => browser.waitForAgentLoad())

    await Promise.all([
      ajaxEventsCapture.waitForResult({ totalCount: 1 }),
      insightsCapture.waitForResult({ totalCount: 1 }),
      interactionEventsCapture.waitForResult({ totalCount: 1 }),
      loggingEventsCapture.waitForResult({ totalCount: 1 }),
      testBlobTraceCapture.waitForResult({ totalCount: 2 }), // the initial trace ALWAYS harvests immediately, but the second one should be tested for early harvest
      browser.execute(function () {
        window.sendAjax()
      })
    ])

    expect(Date.now() - timeStart).toBeLessThan(30000) // should have harvested early before 30 seconds
  })

  it('should NOT re-attempt to harvest early when rate limited', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testInsRequest,
      statusCode: 429
    })

    await browser.url(await browser.testHandle.assetURL('harvest-early-block-internal.html', { init: { harvest: { interval: 30 } } }))
      .then(() => browser.waitForAgentLoad())

    /** not harvesting early in retry mode */
    const [smHarvest] = await Promise.all([
      metricsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        newrelic.addPageAction('test')
      })
        .then(() => browser.pause(10000))
        .then(() => browser.refresh())
    ])

    const insHarvestEarlySeen = smHarvest[0].request.body.sm.find(sm => sm.params.name === 'generic_events/Harvest/Early/Seen')
    // count (c) only exists if the same label is called more than once.  It should have only early harvested once (on page load), which caused it to be denied by 429 by the scheduleReply.  It should NOT try to early harvest twice since it is in retry mode.
    expect(insHarvestEarlySeen.stats.c).toBeUndefined()
  })

  /** if we track internal and spawn early requests, we can potentially create a feedback loop that goes on forever with large ajax requests describing themselves */
  it('should not harvest AJAX early when agent is tracking internal calls', async () => {
    await browser.url(await browser.testHandle.assetURL('harvest-early.html'))
      .then(() => browser.waitForAgentLoad())

    const [ajaxResults] = await Promise.all([
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        window.sendAjax()
      })
    ])

    expect(ajaxResults.length).toBeFalsy()
  })
})
