import { rumFlags } from '../../../tools/testing-server/constants'
import { testAjaxEventsRequest, testBlobReplayRequest, testBlobTraceRequest, testErrorsRequest, testInsRequest, testInteractionEventsRequest, testLogsRequest, testMetricsRequest, testRumRequest, testTimingEventsRequest } from '../../../tools/testing-server/utils/expect-tests'
import { srConfig, stConfig } from '../util/helpers'

/*
This is a series of tests for ensuring the 'ht' (hasTrace) query param is set for expected harvests.
The ht query param will be set on all harvests except for logs and blobs (ones that are considered 'raw').
 */
describe('ht query param', () => {
  let sessionTraceCapture
  let logsCapture
  let sessionReplaysCapture
  let timingEventsCapture
  let metricsCapture
  let ajaxEventsCapture
  let errorsCapture
  let insightsCapture
  let interactionEventsCapture
  beforeEach(async () => {
    [sessionTraceCapture, logsCapture, sessionReplaysCapture, timingEventsCapture,
      metricsCapture, ajaxEventsCapture, errorsCapture, insightsCapture, interactionEventsCapture] =
      await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testBlobTraceRequest },
        { test: testLogsRequest },
        { test: testBlobReplayRequest },
        { test: testTimingEventsRequest },
        { test: testMetricsRequest },
        { test: testAjaxEventsRequest },
        { test: testErrorsRequest },
        { test: testInsRequest },
        { test: testInteractionEventsRequest }
      ])
    await browser.destroyAgentSession()
  })

  it('should be undefined if session trace is running - logs endpoint', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ st: 1, sts: 1, sr: 0, srs: 0, logs: 3 }))
    })
    const url = await browser.testHandle.assetURL('logs-console-logger-pre-load.html', stConfig())

    const [[{ request }]] = await Promise.all([
      logsCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(request.query.ht).toBeUndefined()
  })

  it('should be undefined if session trace is running - blobs endpoint, ST', async () => {
    const url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ st: 1, sts: 1, sr: 1, srs: 0 }))
    })

    let [[{ request }]] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])
    expect(request.query.ht).toBeUndefined()
  })

  it('should be undefined if session trace is running - blobs endpoint, SR', async () => {
    await browser.enableSessionReplay()
    const url = await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig())

    let [[{ request }]] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1, timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForSessionReplayRecording())
    ])
    expect(request.query.ht).toBeUndefined()
  })

  // should have the header for every endpoint except logging and blobs
  it('should be \'1\' if session trace is running - all other endpoints', async () => {
    const url = await browser.testHandle.assetURL('all-events.html', { loader: 'spa', ...stConfig() })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ st: 1, sts: 1 }))
    })

    const [timingEventsHarvests, metricsHarvests, ajaxEventsHarvests,
      errorsHarvests, insightsHarvests, interactionEventsHarvests
    ] = await Promise.all([
      timingEventsCapture.waitForResult({ timeout: 10000 }),
      metricsCapture.waitForResult({ timeout: 10000 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      errorsCapture.waitForResult({ timeout: 10000 }),
      insightsCapture.waitForResult({ timeout: 10000 }),
      interactionEventsCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.pause(5000))
        .then(() => browser.refresh())
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.pause(5000))
    ])

    expect(timingEventsHarvests.some(harvest => harvest.request.query.ht === '1')).toBe(true)
    expect(metricsHarvests.some(harvest => harvest.request.query.ht === '1')).toBe(true)
    expect(ajaxEventsHarvests.some(harvest => harvest.request.query.ht === '1')).toBe(true)
    expect(errorsHarvests.some(harvest => harvest.request.query.ht === '1')).toBe(true)
    expect(insightsHarvests.some(harvest => harvest.request.query.ht === '1')).toBe(true)
    expect(interactionEventsHarvests.some(harvest => harvest.request.query.ht === '1')).toBe(true)
  })

  it('should be undefined if session trace is NOT running - all other endpoints', async () => {
    const url = await browser.testHandle.assetURL('all-events.html', { loader: 'spa', ...stConfig() })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ st: 0 }))
    })

    const [timingEventsHarvests, metricsHarvests, ajaxEventsHarvests,
      errorsHarvests, insightsHarvests, interactionEventsHarvests
    ] = await Promise.all([
      timingEventsCapture.waitForResult({ timeout: 10000 }),
      metricsCapture.waitForResult({ timeout: 10000 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      errorsCapture.waitForResult({ timeout: 10000 }),
      insightsCapture.waitForResult({ timeout: 10000 }),
      interactionEventsCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.pause(5000))
        .then(() => browser.refresh())
    ])

    timingEventsHarvests.forEach(harvest => {
      expect(harvest.request.query.ht).toBeUndefined()
    })
    metricsHarvests.forEach(harvest => {
      expect(harvest.request.query.ht).toBeUndefined()
    })
    ajaxEventsHarvests.forEach(harvest => {
      expect(harvest.request.query.ht).toBeUndefined()
    })
    errorsHarvests.forEach(harvest => {
      expect(harvest.request.query.ht).toBeUndefined()
    })
    insightsHarvests.forEach(harvest => {
      expect(harvest.request.query.ht).toBeUndefined()
    })
    interactionEventsHarvests.forEach(harvest => {
      expect(harvest.request.query.ht).toBeUndefined()
    })
  })
})
