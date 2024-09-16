import { checkAjaxEvents, checkJsErrors, checkMetrics, checkPVT, checkPageAction, checkRumBody, checkRumQuery, checkSessionTrace, checkSpa } from '../util/basic-checks'
import { testAjaxEventsRequest, testBlobTraceRequest, testErrorsRequest, testInsRequest, testInteractionEventsRequest, testMetricsRequest, testRumRequest, testTimingEventsRequest } from '../../tools/testing-server/utils/expect-tests'

const scriptLoadTypes = [null, 'defer', 'async', 'injection']

describe('Loaders', () => {
  let rumCapture
  let timingEventsCapture
  let metricsCapture
  let ajaxEventsCapture
  let errorsCapture
  let insightsCapture
  let tracesCapture
  let interactionEventsCapture

  beforeEach(async () => {
    [rumCapture, timingEventsCapture, metricsCapture, ajaxEventsCapture, errorsCapture, insightsCapture, tracesCapture, interactionEventsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testTimingEventsRequest },
      { test: testMetricsRequest },
      { test: testAjaxEventsRequest },
      { test: testErrorsRequest },
      { test: testInsRequest },
      { test: testBlobTraceRequest },
      { test: testInteractionEventsRequest }
    ])
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  scriptLoadTypes.forEach(scriptLoadType => {
    it(`should report data for the lite agent when using ${!scriptLoadType ? 'embedded' : scriptLoadType}`, async () => {
      const url = await browser.testHandle.assetURL('all-events.html', { loader: 'rum', script: scriptLoadType })
      const [rumHarvests, timingEventsHarvests, metricsHarvests, ajaxEventsHarvests, errorsHarvests, insightsHarvests, tracesHarvests, interactionEventsHarvests] = await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        timingEventsCapture.waitForResult({ timeout: 10000 }),
        metricsCapture.waitForResult({ timeout: 10000 }),
        ajaxEventsCapture.waitForResult({ timeout: 10000 }),
        errorsCapture.waitForResult({ timeout: 10000 }),
        insightsCapture.waitForResult({ timeout: 10000 }),
        tracesCapture.waitForResult({ timeout: 10000 }),
        interactionEventsCapture.waitForResult({ timeout: 10000 }),
        browser.url(url)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.pause(5000))
          .then(() => browser.refresh())
      ])

      rumHarvests.forEach(harvest => checkRumQuery(harvest.request, { liteAgent: true }))
      rumHarvests.forEach(harvest => checkRumBody(harvest.request, { liteAgent: true }))
      timingEventsHarvests.forEach(harvest => checkPVT(harvest.request))
      metricsHarvests.forEach(harvest => checkMetrics(harvest.request))

      expect(ajaxEventsHarvests.length).toEqual(0)
      expect(errorsHarvests.length).toEqual(0)
      expect(insightsHarvests.length).toEqual(0)
      expect(tracesHarvests.length).toEqual(0)
      expect(interactionEventsHarvests.length).toEqual(0)
    })

    it(`should report data for the pro agent when using ${!scriptLoadType ? 'embedded' : scriptLoadType}`, async () => {
      const url = await browser.testHandle.assetURL('all-events.html', { loader: 'full', script: scriptLoadType })
      const [rumHarvests, timingEventsHarvests, metricsHarvests, ajaxEventsHarvests, errorsHarvests, insightsHarvests, tracesHarvests, interactionEventsHarvests] = await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        timingEventsCapture.waitForResult({ timeout: 10000 }),
        metricsCapture.waitForResult({ timeout: 10000 }),
        ajaxEventsCapture.waitForResult({ timeout: 10000 }),
        errorsCapture.waitForResult({ timeout: 10000 }),
        insightsCapture.waitForResult({ timeout: 10000 }),
        tracesCapture.waitForResult({ timeout: 10000 }),
        interactionEventsCapture.waitForResult({ timeout: 10000 }),
        browser.url(url)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.pause(5000))
          .then(() => browser.refresh())
      ])

      rumHarvests.forEach(harvest => checkRumQuery(harvest.request))
      rumHarvests.forEach(harvest => checkRumBody(harvest.request))
      timingEventsHarvests.forEach(harvest => checkPVT(harvest.request))
      metricsHarvests.forEach(harvest => checkMetrics(harvest.request))
      ajaxEventsHarvests.forEach(harvest => checkAjaxEvents(harvest.request))
      errorsHarvests.forEach(harvest => checkJsErrors(harvest.request))
      insightsHarvests.forEach(harvest => checkPageAction(harvest.request))
      tracesHarvests.forEach(harvest => checkSessionTrace(harvest.request))

      expect(interactionEventsHarvests.length).toEqual(0)
    })

    it(`should report data for the spa agent when using ${!scriptLoadType ? 'embedded' : scriptLoadType}`, async () => {
      const url = await browser.testHandle.assetURL('all-events.html', { loader: 'spa', script: scriptLoadType })
      const [rumHarvests, timingEventsHarvests, metricsHarvests, ajaxEventsHarvests, errorsHarvests, insightsHarvests, tracesHarvests, interactionEventsHarvests] = await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        timingEventsCapture.waitForResult({ timeout: 10000 }),
        metricsCapture.waitForResult({ timeout: 10000 }),
        ajaxEventsCapture.waitForResult({ timeout: 10000 }),
        errorsCapture.waitForResult({ timeout: 10000 }),
        insightsCapture.waitForResult({ timeout: 10000 }),
        tracesCapture.waitForResult({ timeout: 10000 }),
        interactionEventsCapture.waitForResult({ timeout: 10000 }),
        browser.url(url)
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.pause(5000))
          .then(() => browser.refresh())
      ])

      rumHarvests.forEach(harvest => checkRumQuery(harvest.request))
      rumHarvests.forEach(harvest => checkRumBody(harvest.request))
      timingEventsHarvests.forEach(harvest => checkPVT(harvest.request))
      metricsHarvests.forEach(harvest => checkMetrics(harvest.request))
      ajaxEventsHarvests.forEach(harvest => checkAjaxEvents(harvest.request))
      errorsHarvests.forEach(harvest => checkJsErrors(harvest.request))
      insightsHarvests.forEach(harvest => checkPageAction(harvest.request))
      tracesHarvests.forEach(harvest => checkSessionTrace(harvest.request))
      interactionEventsHarvests.forEach(harvest => checkSpa(harvest.request))
    })
  })
})
