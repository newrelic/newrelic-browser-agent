import { testAjaxEventsRequest, testAjaxTimeSlicesRequest, testBlobReplayRequest, testBlobTraceRequest, testErrorsRequest, testInsRequest, testInteractionEventsRequest, testRumRequest, testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('rum retry harvesting', () => {
  let rumCapture
  let timingEventsCapture
  let ajaxEventsCapture
  let ajaxMetricsCapture
  let traceCapture
  let insightsCapture
  let interactionEventsCapture
  let errorMetricsCapture
  let replaysCapture

  beforeEach(async () => {
    [rumCapture, timingEventsCapture, ajaxEventsCapture, ajaxMetricsCapture, traceCapture, insightsCapture, interactionEventsCapture, errorMetricsCapture, replaysCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testTimingEventsRequest },
      { test: testAjaxEventsRequest },
      { test: testAjaxTimeSlicesRequest },
      { test: testBlobTraceRequest },
      { test: testInsRequest },
      { test: testInteractionEventsRequest },
      { test: testErrorsRequest },
      { test: testBlobReplayRequest }
    ])
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  ;[400, 404, 408, 429, 500, 502, 503, 504, 512].forEach(statusCode => {
    it(`should not retry rum and should not continue harvesting when request statusCode is ${statusCode}`, async () => {
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        permanent: true,
        statusCode,
        body: ''
      })

      let [
        rumHarvests,
        timingEventsHarvests,
        ajaxEventsHarvests,
        ajaxMetricsHarvests,
        insightsHarvests,
        interactionEventsHarvests,
        traceHarvests,
        errorMetricsHarvests,
        replaysHarvests
      ] = await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        timingEventsCapture.waitForResult({ timeout: 10000 }),
        ajaxEventsCapture.waitForResult({ timeout: 10000 }),
        ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
        insightsCapture.waitForResult({ timeout: 10000 }),
        interactionEventsCapture.waitForResult({ timeout: 10000 }),
        traceCapture.waitForResult({ timeout: 10000 }),
        errorMetricsCapture.waitForResult({ timeout: 10000 }),
        replaysCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('obfuscate-pii.html'))
          .then(() => $('a').click())
          .then(() => browser.execute(function () {
            newrelic.noticeError(new Error('hippo hangry'))
            newrelic.addPageAction('DummyEvent', { free: 'tacos' })
          }))
      ])

      if (statusCode === 408) {
        // Browsers automatically retry requests with status code 408
        expect(rumHarvests.length).toBeLessThan(5)
      } else {
        expect(rumHarvests.length).toEqual(1)
      }
      expect(rumHarvests[0].reply.statusCode).toEqual(statusCode)

      expect(timingEventsHarvests.length).toEqual(0)
      expect(ajaxEventsHarvests.length).toEqual(0)
      expect(ajaxMetricsHarvests.length).toEqual(0)
      expect(insightsHarvests.length).toEqual(0)
      expect(interactionEventsHarvests.length).toEqual(0)
      expect(traceHarvests.length).toEqual(0)
      expect(errorMetricsHarvests.length).toEqual(0)
      expect(replaysHarvests.length).toEqual(0)

      ;[
        rumHarvests,
        timingEventsHarvests,
        ajaxEventsHarvests,
        ajaxMetricsHarvests,
        insightsHarvests,
        interactionEventsHarvests,
        traceHarvests,
        errorMetricsHarvests,
        replaysHarvests
      ] = await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        timingEventsCapture.waitForResult({ timeout: 10000 }),
        ajaxEventsCapture.waitForResult({ timeout: 10000 }),
        ajaxMetricsCapture.waitForResult({ timeout: 10000 }),
        insightsCapture.waitForResult({ timeout: 10000 }),
        interactionEventsCapture.waitForResult({ timeout: 10000 }),
        traceCapture.waitForResult({ timeout: 10000 }),
        errorMetricsCapture.waitForResult({ timeout: 10000 }),
        replaysCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('/'))
      ])

      if (statusCode === 408) {
        // Browsers automatically retry requests with status code 408
        expect(rumHarvests.length).toBeLessThan(5)
      } else {
        expect(rumHarvests.length).toEqual(1)
      }

      expect(timingEventsHarvests.length).toEqual(0)
      expect(ajaxEventsHarvests.length).toEqual(0)
      expect(ajaxMetricsHarvests.length).toEqual(0)
      expect(insightsHarvests.length).toEqual(0)
      expect(interactionEventsHarvests.length).toEqual(0)
      expect(traceHarvests.length).toEqual(0)
      expect(errorMetricsHarvests.length).toEqual(0)
      expect(replaysHarvests.length).toEqual(0)
    })
  })
})
