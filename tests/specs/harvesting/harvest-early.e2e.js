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

    await browser.enableLogging()
  })

  it('should harvest early when exceeding ideal size', async () => {
    await browser.url(await browser.testHandle.assetURL('harvest-early-block-internal.html'))
      .then(() => browser.waitForAgentLoad())

    const timeStart = Date.now()
    const [ajaxResults] = await Promise.all([
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

    // Verify that the non-internal AJAX event was captured for the pokemon API request
    const ajaxBody = ajaxResults[0].request.body
    expect(ajaxBody).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: 'pokeapi.co:443',
        path: '/api/v2/pokemon/moltres'
      })
    ]))
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

    expect(ajaxResults.length).toEqual(1) // this is the on-page-load harvest; it should not have a 2nd or more harvest within 10s
    const ajaxBody = ajaxResults[0].request.body

    // Verify that the AJAX event is an internal call to the BAM server
    expect(ajaxBody).toEqual(expect.arrayContaining([
      expect.objectContaining({
        domain: expect.stringContaining('bam-test-1.nr-local.net')
      })
    ]))
  })

  describe('when a page floods the agent with logs', () => {
    afterEach(async () => {
      // logging mode is sticky to the session, so we need to reset before the next test
      await browser.destroyAgentSession()
    })

    const getLogMessages = (results) => results.flatMap(({ request: { body } }) => {
      const payload = typeof body === 'string' ? JSON.parse(body) : body
      return payload[0].logs.map(log => log.message)
    })

    /** an attribute that is overwritten repeatedly must not make the agent believe every single log is over the early harvest size */
    it('should not harvest logs early on every log after an attribute is overwritten repeatedly', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { harvest: { interval: 30 } } }))
        .then(() => browser.waitForAgentLoad())

      await browser.execute(function () {
        for (let i = 0; i < 2000; i++) newrelic.setCustomAttribute('pressure', 'some-value')
        for (let i = 0; i < 20; i++) newrelic.log('overwrite flood ' + i)
      })

      const results = await loggingEventsCapture.waitForResult({ timeout: 5000 })

      /* Before the fix, each of the 20 logs triggered its own request. Allow a small margin for the one-time harvest that happens right as the feature drains. */
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should limit early harvests during a flood of logs and deliver every log', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { harvest: { interval: 5 } } }))
        .then(() => browser.waitForAgentLoad())

      const totalLogs = 150
      await browser.execute(function (total) {
        const padding = 'x'.repeat(1000)
        for (let i = 0; i < total; i++) newrelic.log('flood ' + i + ' ' + padding)
      }, totalLogs)

      const results = await loggingEventsCapture.waitForResult({ timeout: 12000 })
      const floodMessages = getLogMessages(results).filter(message => message.startsWith('flood '))

      /* 150 logs of ~1KB each is roughly 150KB. Without a limit, that is roughly one early harvest per 16KB (about a dozen requests). With it: at most one early harvest, plus the interval harvests that pick up the rest. */
      expect(results.length).toBeLessThanOrEqual(5)
      // nothing was dropped by limiting the early harvests
      expect(new Set(floodMessages.map(message => message.split(' ')[1])).size).toEqual(totalLogs)
    })

    /** a flood larger than the buffer's maximum size must not lose logs while early harvests are being limited */
    it('should not drop logs when a flood is larger than the buffer can hold', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { init: { harvest: { interval: 5 } } }))
        .then(() => browser.waitForAgentLoad())

      const totalLogs = 2000
      await browser.execute(function (total) {
        const padding = 'x'.repeat(1000)
        for (let i = 0; i < total; i++) newrelic.log('bigflood ' + i + ' ' + padding)
      }, totalLogs)

      const results = await loggingEventsCapture.waitForResult({ timeout: 15000 })
      const floodMessages = getLogMessages(results).filter(message => message.startsWith('bigflood '))

      /* 2000 logs of ~1.2KB each is more than the 1MB buffer maximum, so any logs held back instead of harvested would be dropped. */
      expect(results.length).toBeLessThanOrEqual(10)
      expect(new Set(floodMessages.map(message => message.split(' ')[1])).size).toEqual(totalLogs)
    })
  })
})
