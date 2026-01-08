import { faker } from '@faker-js/faker'
import { srConfig, decodeAttributes } from './util/helpers'
import { testAjaxEventsRequest, testBlobReplayRequest, testBlobTraceRequest, testErrorsRequest, testInsRequest, testInteractionEventsRequest, testLogsRequest, testRumRequest, testTimingEventsRequest } from '../../tools/testing-server/utils/expect-tests'

let serverTime
describe('NR Server Time', () => {
  beforeEach(async () => {
    serverTime = await browser.mockDateResponse()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should send page view event wth rst parameter and no timestamp when nr server time unknown', async () => {
    const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(parseInt(rumHarvest.request.query.rst, 10)).toBeGreaterThan(0)
    expect(rumHarvest.request.query.timestamp).toBeUndefined()
  })

  it('should send page view event wth rst and timestamp parameter when nr server time is known', async () => {
    const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [[, rumHarvest], timeKeeper] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 2 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getPageTime())
    ])

    const rumTimestamp = parseInt(rumHarvest.request.query.timestamp, 10)
    expect(parseInt(rumHarvest.request.query.rst, 10)).toBeGreaterThan(0)
    expect(rumTimestamp).toBeGreaterThan(serverTime)
    testTimeExpectations(rumTimestamp, timeKeeper, false)
  })

  it('should send jserror with timestamp prior to rum date header', async () => {
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    const [[errorsHarvest], timeKeeper] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('nr-server-time/error-before-load.html'))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getPageTime())
    ])

    const error = errorsHarvest.request.body.err[0]
    expect(error.params.firstOccurrenceTimestamp).toEqual(error.params.timestamp)
    testTimeExpectations(error.params.timestamp, timeKeeper, true)
  })

  it('should send jserror with timestamp after rum date header', async () => {
    const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    const timeKeeper = await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.getPageTime())

    const [[errorsHarvest]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.getPageTime(),
      browser.execute(function () {
        newrelic.noticeError(new Error('test error'))
      })
    ])

    const error = errorsHarvest.request.body.err[0]
    expect(error.params.firstOccurrenceTimestamp).toEqual(error.params.timestamp)
    testTimeExpectations(error.params.timestamp, timeKeeper, false)
  })

  it('should send session replay with timestamp prior to rum date header', async () => {
    const sessionReplayCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.destroyAgentSession()
    await browser.testHandle.clearScheduledReplies('bamServer')

    serverTime = await browser.mockDateResponse(undefined, { flags: { sr: 1, srs: 1 } })
    const [[{ request: replayData }], timeKeeper] = await Promise.all([
      sessionReplayCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: true } })))
        .then(() => browser.waitForSessionReplayRecording())
        .then(() => browser.getPageTime())
    ])

    const attrs = decodeAttributes(replayData.query.attributes)
    const firstTimestamp = attrs['replay.firstTimestamp']
    testTimeExpectations(firstTimestamp, timeKeeper, true)

    await browser.destroyAgentSession()
  })

  it('should send session replay with timestamp after rum date header', async () => {
    const sessionReplayCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.destroyAgentSession()
    await browser.testHandle.clearScheduledReplies('bamServer')

    serverTime = await browser.mockDateResponse(undefined, { flags: { sr: 1, srs: 1 } })
    const [[{ request: replayData }], timeKeeper] = await Promise.all([
      sessionReplayCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { sampling_rate: 100, preload: false } })))
        .then(() => browser.waitForSessionReplayRecording())
        .then(() => browser.getPageTime())
    ])
    const attrs = decodeAttributes(replayData.query.attributes)
    const firstTimestamp = attrs['replay.firstTimestamp']
    testTimeExpectations(firstTimestamp, timeKeeper, false)

    await browser.destroyAgentSession()
  })

  it('should send page action with timestamp before rum date header', async () => {
    const insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
    const [[insightsHarvest], timeKeeper] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('nr-server-time/page-action-before-load.html'))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getPageTime())
    ])

    const pageAction = insightsHarvest.request.body.ins[0]
    testTimeExpectations(pageAction.timestamp, timeKeeper, true)
  })

  it('should send page action with timestamp after rum date header', async () => {
    const insightsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInsRequest })
    const timeKeeper = await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.getPageTime())

    const [[insightsHarvest]] = await Promise.all([
      insightsCapture.waitForResult({ totalCount: 1 }),
      browser.execute(function () {
        newrelic.addPageAction('bizbaz')
      })
    ])

    const pageAction = insightsHarvest.request.body.ins[0]
    testTimeExpectations(pageAction.timestamp, timeKeeper, false)
  })

  it('should send xhr with distributed tracing timestamp before rum date header', async () => {
    const interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
    const url = await browser.testHandle.assetURL('nr-server-time/xhr-before-load.html', {
      config: {
        accountID: faker.string.hexadecimal({ length: 16, prefix: '' }),
        agentID: faker.string.hexadecimal({ length: 16, prefix: '' }),
        trustKey: faker.string.hexadecimal({ length: 16, prefix: '' })
      },
      injectUpdatedLoaderConfig: true,
      init: {
        distributed_tracing: {
          enabled: true,
          cors_use_newrelic_header: true,
          cors_use_tracecontext_headers: true,
          allowed_origins: ['http://' + browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port]
        }
      }
    })

    const [[interactionsHarvest], timeKeeper] = await Promise.all([
      interactionsCapture.waitForResult({ totalCount: 1 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getPageTime())
    ])

    const ajaxEvent = interactionsHarvest.request.body[0].children.find(r => r.path === '/json' && r.requestedWith === 'XMLHttpRequest')
    testTimeExpectations(ajaxEvent.timestamp, timeKeeper, true)

    const fetchEvent = interactionsHarvest.request.body[0].children.find(r => r.path === '/json' && r.requestedWith === 'fetch')
    testTimeExpectations(fetchEvent.timestamp, timeKeeper, true)
  })

  it('should send xhr with distributed tracing timestamp after rum date header', async () => {
    const ajaxEventsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testAjaxEventsRequest })
    const url = await browser.testHandle.assetURL('instrumented.html', {
      config: {
        accountID: faker.string.hexadecimal({ length: 16, prefix: '' }),
        agentID: faker.string.hexadecimal({ length: 16, prefix: '' }),
        trustKey: faker.string.hexadecimal({ length: 16, prefix: '' })
      },
      injectUpdatedLoaderConfig: true,
      init: {
        distributed_tracing: {
          enabled: true,
          cors_use_newrelic_header: true,
          cors_use_tracecontext_headers: true,
          allowed_origins: ['http://' + browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port]
        }
      }
    })

    const timeKeeper = await browser.url(url)
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.getPageTime())

    const [ajaxEventsHarvests] = await Promise.all([
      ajaxEventsCapture.waitForResult({ totalCount: 2 }), // first is on page load, 2nd is from our test
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/json')
        xhr.send()

        if (typeof fetch !== 'undefined') {
          fetch('/json')
        }
      })
    ])

    const ajaxEvent = ajaxEventsHarvests[1].request.body.find(r => r.path === '/json' && r.requestedWith === 'XMLHttpRequest')
    testTimeExpectations(ajaxEvent.timestamp, timeKeeper, false)

    const fetchEvent = ajaxEventsHarvests[1].request.body.find(r => r.path === '/json' && r.requestedWith === 'fetch')
    testTimeExpectations(fetchEvent.timestamp, timeKeeper, false)
  })

  it('should send all payloads with floored absolute timestamps', async () => {
    const [rumCapture, timingEventsCapture, ajaxEventsCapture, errorsCapture, insightsCapture, tracesCapture, interactionEventsCapture, logsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testRumRequest },
      { test: testTimingEventsRequest },
      { test: testAjaxEventsRequest },
      { test: testErrorsRequest },
      { test: testInsRequest },
      { test: testBlobTraceRequest },
      { test: testInteractionEventsRequest },
      { test: testLogsRequest }
    ])

    const url = await browser.testHandle.assetURL('all-events.html', {
      config: {
        accountID: faker.string.hexadecimal({ length: 16, prefix: '' }),
        agentID: faker.string.hexadecimal({ length: 16, prefix: '' }),
        trustKey: faker.string.hexadecimal({ length: 16, prefix: '' })
      },
      injectUpdatedLoaderConfig: true,
      init: {
        distributed_tracing: {
          enabled: true,
          cors_use_newrelic_header: true,
          cors_use_tracecontext_headers: true,
          allowed_origins: [
            'http://' + browser.testHandle.assetServerConfig.host + ':' + browser.testHandle.assetServerConfig.port,
            'http://' + browser.testHandle.bamServerConfig.host + ':' + browser.testHandle.bamServerConfig.port
          ]
        }
      }
    })

    const [rumHarvests, timingEventsHarvests, ajaxEventsHarvests, errorsHarvests, insightsHarvests, tracesHarvests, interactionEventsHarvests, logsHarvests] = await Promise.all([
      rumCapture.waitForResult({ timeout: 10000 }),
      timingEventsCapture.waitForResult({ timeout: 10000 }),
      ajaxEventsCapture.waitForResult({ timeout: 10000 }),
      errorsCapture.waitForResult({ timeout: 10000 }),
      insightsCapture.waitForResult({ timeout: 10000 }),
      tracesCapture.waitForResult({ timeout: 10000 }),
      interactionEventsCapture.waitForResult({ timeout: 10000 }),
      logsCapture.waitForResult({ timeout: 10000 }),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
    ])

    expect(rumHarvests.length).toBeGreaterThan(0)
    rumHarvests.forEach(harvest => checkTimestampsFlooredAbsolute(harvest.request.query))
    expect(timingEventsHarvests.length).toBeGreaterThan(0)
    timingEventsHarvests.forEach(harvest => {
      checkTimestampsFlooredAbsolute(harvest.request.body)
      checkTimestampsFlooredAbsolute(harvest.request.query)
    })
    expect(ajaxEventsHarvests.length).toBeGreaterThan(0)
    ajaxEventsHarvests.forEach(harvest => checkTimestampsFlooredAbsolute(harvest.request.body))
    expect(errorsHarvests.length).toBeGreaterThan(0)
    errorsHarvests.forEach(harvest => {
      checkTimestampsFlooredAbsolute(harvest.request.body)
      checkTimestampsFlooredAbsolute(harvest.request.query)
    })
    expect(insightsHarvests.length).toBeGreaterThan(0)
    insightsHarvests.forEach(harvest => {
      checkTimestampsFlooredAbsolute(harvest.request.body)
      checkTimestampsFlooredAbsolute(harvest.request.query)
    })
    expect(tracesHarvests.length).toBeGreaterThan(0)
    tracesHarvests.forEach(harvest => {
      checkTimestampsFlooredAbsolute(harvest.request.body)
      checkTimestampsFlooredAbsolute(harvest.request.query)
    })
    expect(interactionEventsHarvests.length).toBeGreaterThan(0)
    interactionEventsHarvests.forEach(harvest => {
      checkTimestampsFlooredAbsolute(harvest.request.body)
      checkTimestampsFlooredAbsolute(harvest.request.query)
    })
    expect(logsHarvests.length).toBeGreaterThan(0)
    logsHarvests.forEach(harvest => {
      checkTimestampsFlooredAbsolute(harvest.request.body)
      checkTimestampsFlooredAbsolute(harvest.request.query)
    })
  })

  describe('session integration', () => {
    it('should not re-use the server time diff when session tracking is disabled', async () => {
      const url = await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: false }
        }
      })
      await browser.url(url).then(() => browser.waitForAgentLoad())

      const initialServerTime = await browser.getPageTime()
      const initialServerTimeDiff = initialServerTime.originTime - initialServerTime.correctedOriginTime

      await browser.url(url).then(() => browser.waitForAgentLoad())

      const subsequentServerTime = await browser.getPageTime()
      const subsequentServerTimeDiff = subsequentServerTime.originTime - subsequentServerTime.correctedOriginTime

      expect(subsequentServerTimeDiff).not.toEqual(initialServerTimeDiff)
    })

    it('should re-use the server time diff stored in the session', async () => {
      const url = await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })
      await browser.url(url).then(() => browser.waitForAgentLoad())

      const initialSession = await browser.getAgentSessionInfo()
      const initialServerTime = await browser.getPageTime()
      const initialServerTimeDiff = initialServerTime.originTime - initialServerTime.correctedOriginTime

      await browser.url(url).then(() => browser.waitForAgentLoad())

      const subsequentSession = await browser.getAgentSessionInfo()
      const subsequentServerTime = await browser.getPageTime()
      const subsequentServerTimeDiff = subsequentServerTime.originTime - subsequentServerTime.correctedOriginTime

      expect(subsequentServerTimeDiff).toEqual(initialServerTimeDiff)
      expect(subsequentSession.localStorage.serverTimeDiff).toEqual(initialSession.localStorage.serverTimeDiff)
    })

    it('should re-use the server time diff already calculated when session times out - inactivity', async () => {
      const url = await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true },
          session: { inactiveMs: 10000 }
        }
      })
      await browser.url(url).then(() => browser.waitForAgentLoad())

      const initialSession = await browser.getAgentSessionInfo()
      const initialServerTime = await browser.getPageTime()
      const initialServerTimeDiff = initialServerTime.originTime - initialServerTime.correctedOriginTime

      await browser.pause(10000)

      const subsequentSession = await browser.getAgentSessionInfo()
      const subsequentServerTime = await browser.getPageTime()
      const subsequentServerTimeDiff = subsequentServerTime.originTime - subsequentServerTime.correctedOriginTime

      expect(subsequentServerTimeDiff).toEqual(initialServerTimeDiff)
      expect(subsequentSession.localStorage.serverTimeDiff).toEqual(initialSession.localStorage.serverTimeDiff)
    })

    it('should re-use the server time diff already calculated when session times out - expires', async () => {
      const url = await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true },
          session: { expiresMs: 10000 }
        }
      })
      await browser.url(url).then(() => browser.waitForAgentLoad())

      const initialSession = await browser.getAgentSessionInfo()
      const initialServerTime = await browser.getPageTime()
      const initialServerTimeDiff = initialServerTime.originTime - initialServerTime.correctedOriginTime

      await browser.pause(10000)

      const subsequentSession = await browser.getAgentSessionInfo()
      const subsequentServerTime = await browser.getPageTime()
      const subsequentServerTimeDiff = subsequentServerTime.originTime - subsequentServerTime.correctedOriginTime

      expect(subsequentServerTimeDiff).toEqual(initialServerTimeDiff)
      expect(subsequentSession.localStorage.serverTimeDiff).toEqual(initialSession.localStorage.serverTimeDiff)
    })
  })
})

/**
 *
 * @param {Number} timestamp The timestamp from the event
 * @param {Object} pageTimings The timekeeper metadata
 * @param {Boolean} before If the timestamp should be evaluated as before or after the local stamp. (This only occurs when test cant get the actual origin times -- ex. IE11)
 */
function testTimeExpectations (timestamp, pageTimings, before) {
  const { correctedOriginTime, originTime } = (pageTimings || {})

  expect(timestamp.toString()).toMatch(/^\d{13}$/)

  expect(Math.abs(serverTime - originTime + 3600000)).toBeLessThan(10000) // origin time should be about an hour ahead (3600000 ms)
  expect(Math.abs(serverTime - correctedOriginTime)).toBeLessThan(10000) // corrected origin time should roughly match the server time on our side
  expect(Math.abs(correctedOriginTime - originTime + 3600000)).toBeLessThan(10000)

  expect(Math.abs(timestamp - correctedOriginTime)).toBeLessThan(10000) // should expect a reasonable tolerance (and much less than an hour)
  expect(Math.abs(timestamp - originTime + 3600000)).toBeLessThan(10000) // should expect a reasonable tolerance (and much less than an hour)
  expect(timestamp).toBeGreaterThan(correctedOriginTime)
  expect(timestamp).toBeLessThan(originTime)
}

function checkTimestampsFlooredAbsolute (payload) {
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (key === 'timestamp' || (typeof value !== 'undefined' && value !== null && /^\d{13}/.test(value.toString()))) {
      expect(value.toString()).toMatch(/^\d{13}$/)
    } else if (typeof value === 'object') {
      checkTimestampsFlooredAbsolute(value)
    }
  })
}
