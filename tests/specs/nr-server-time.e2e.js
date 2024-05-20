import { faker } from '@faker-js/faker'
import { srConfig, decodeAttributes } from './util/helpers'
import { notIE, supportsFetch } from '../../tools/browser-matcher/common-matchers.mjs'

let serverTime
describe('NR Server Time', () => {
  beforeEach(async () => {
    serverTime = await browser.mockDateResponse()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should send page view event wth rst parameter and no timestamp when nr server time unknown', async () => {
    const [rum] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(parseInt(rum.request.query.rst, 10)).toBeGreaterThan(0)
    expect(rum.request.query.timestamp).toBeUndefined()
  })

  it('should send page view event wth rst and timestamp parameter when nr server time is known', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())

    const [rum, timeKeeper] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html'))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getPageTime())
    ])

    const rumTimestamp = parseInt(rum.request.query.timestamp, 10)
    expect(parseInt(rum.request.query.rst, 10)).toBeGreaterThan(0)
    expect(rumTimestamp).toBeGreaterThan(serverTime)
    testTimeExpectations(rumTimestamp, timeKeeper, false)
  })

  it('should send jserror with timestamp prior to rum date header', async () => {
    const [errors, timeKeeper] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.url(await browser.testHandle.assetURL('nr-server-time/error-before-load.html'))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getPageTime())
    ])

    const error = errors.request.body.err[0]
    expect(error.params.firstOccurrenceTimestamp).toEqual(error.params.timestamp)
    testTimeExpectations(error.params.timestamp, timeKeeper, true)
  })

  it('should send jserror with timestamp after rum date header', async () => {
    const timeKeeper = await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.getPageTime())

    const [errors] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.getPageTime(),
      browser.execute(function () {
        newrelic.noticeError(new Error('test error'))
      })
    ])

    const error = errors.request.body.err[0]
    expect(error.params.firstOccurrenceTimestamp).toEqual(error.params.timestamp)
    testTimeExpectations(error.params.timestamp, timeKeeper, false)
  })

  it.withBrowsersMatching(notIE)('should send session replay with timestamp prior to rum date header', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.clearScheduledReplies('bamServer')
    serverTime = await browser.mockDateResponse(undefined, { flags: { sr: 1, srs: 1 } })
    const [{ request: replayData }, timeKeeper] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: true } })))
        .then(() => browser.waitForSessionReplayRecording())
        .then(() => browser.getPageTime())
    ])

    replayData.body.forEach(x => {
      expect(x.__newrelic).toMatchObject({
        originalTimestamp: expect.any(Number),
        correctedTimestamp: expect.any(Number),
        timestampDiff: expect.any(Number),
        originTime: expect.any(Number),
        correctedOriginTime: expect.any(Number),
        originTimeDiff: expect.any(Number)
      })
      expect(x.__newrelic.timestampDiff - x.__newrelic.originTimeDiff).toBeLessThanOrEqual(1) //  account for rounding error
      testTimeExpectations(x.__newrelic.correctedTimestamp, {
        originTime: x.__newrelic.originTime,
        correctedOriginTime: x.__newrelic.correctedOriginTime
      }, true)
    })
    const attrs = decodeAttributes(replayData.query.attributes)
    const firstTimestamp = attrs['replay.firstTimestamp']
    testTimeExpectations(firstTimestamp, timeKeeper, true)

    await browser.destroyAgentSession()
  })

  it.withBrowsersMatching(notIE)('should send session replay with timestamp after rum date header', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.clearScheduledReplies('bamServer')
    serverTime = await browser.mockDateResponse(undefined, { flags: { sr: 1, srs: 1 } })
    const [{ request: replayData }, timeKeeper] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { sampling_rate: 100, preload: false } })))
        .then(() => browser.waitForSessionReplayRecording())
        .then(() => browser.getPageTime())
    ])
    replayData.body.forEach(x => {
      expect(x.__newrelic).toMatchObject({
        originalTimestamp: expect.any(Number),
        correctedTimestamp: expect.any(Number),
        timestampDiff: expect.any(Number),
        originTime: expect.any(Number),
        correctedOriginTime: expect.any(Number),
        originTimeDiff: expect.any(Number)
      })
      expect(x.__newrelic.timestampDiff - x.__newrelic.originTimeDiff).toBeLessThanOrEqual(1) //  account for rounding error
      testTimeExpectations(x.__newrelic.correctedTimestamp, {
        originTime: x.__newrelic.originTime,
        correctedOriginTime: x.__newrelic.correctedOriginTime
      }, true)
    })
    const attrs = decodeAttributes(replayData.query.attributes)
    const firstTimestamp = attrs['replay.firstTimestamp']
    testTimeExpectations(firstTimestamp, timeKeeper, false)

    await browser.destroyAgentSession()
  })

  it('should send page action with timestamp before rum date header', async () => {
    const [pageActions, timeKeeper] = await Promise.all([
      browser.testHandle.expectIns(),
      browser.url(await browser.testHandle.assetURL('nr-server-time/page-action-before-load.html'))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getPageTime())
    ])

    const pageAction = pageActions.request.body.ins[0]
    testTimeExpectations(pageAction.timestamp, timeKeeper, true)
  })

  it('should send page action with timestamp after rum date header', async () => {
    const timeKeeper = await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.getPageTime())

    const [pageActions] = await Promise.all([
      browser.testHandle.expectIns(),
      browser.execute(function () {
        newrelic.addPageAction('bizbaz')
      })
    ])

    const pageAction = pageActions.request.body.ins[0]
    testTimeExpectations(pageAction.timestamp, timeKeeper, false)
  })

  it('should send xhr with distributed tracing timestamp before rum date header', async () => {
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

    const [interactionEvents, timeKeeper] = await Promise.all([
      browser.testHandle.expectInteractionEvents(),
      browser.url(url)
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getPageTime())
    ])

    const ajaxEvent = interactionEvents.request.body[0].children.find(r => r.path === '/json' && r.requestedWith === 'XMLHttpRequest')
    testTimeExpectations(ajaxEvent.timestamp, timeKeeper, true)

    if (browserMatch(supportsFetch)) {
      const fetchEvent = interactionEvents.request.body[0].children.find(r => r.path === '/json' && r.requestedWith === 'fetch')
      testTimeExpectations(fetchEvent.timestamp, timeKeeper, true)
    }
  })

  it('should send xhr with distributed tracing timestamp after rum date header', async () => {
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

    const [ajaxEvents] = await Promise.all([
      browser.testHandle.expectAjaxEvents(),
      browser.execute(function () {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', '/json')
        xhr.send()

        if (typeof fetch !== 'undefined') {
          fetch('/json')
        }
      })
    ])

    const ajaxEvent = ajaxEvents.request.body.find(r => r.path === '/json' && r.requestedWith === 'XMLHttpRequest')
    testTimeExpectations(ajaxEvent.timestamp, timeKeeper, false)

    if (browserMatch(supportsFetch)) {
      const fetchEvent = ajaxEvents.request.body.find(r => r.path === '/json' && r.requestedWith === 'fetch')
      testTimeExpectations(fetchEvent.timestamp, timeKeeper, false)
    }
  })

  describe('session integration', () => {
    it('should not re-use the server time diff when session tracking is disabled', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: false }
        }
      })).then(() => browser.waitForAgentLoad())

      const initialServerTime = await browser.getPageTime()
      const initialServerTimeDiff = initialServerTime.originTime - initialServerTime.correctedOriginTime

      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: false }
        }
      })).then(() => browser.waitForAgentLoad())

      const subsequentServerTime = await browser.getPageTime()
      const subsequentServerTimeDiff = subsequentServerTime.originTime - subsequentServerTime.correctedOriginTime

      expect(subsequentServerTimeDiff).not.toEqual(initialServerTimeDiff)
    })

    it('should re-use the server time diff stored in the session', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })).then(() => browser.waitForAgentLoad())

      const initialSession = await browser.getAgentSessionInfo()
      const initialServerTime = await browser.getPageTime()
      const initialServerTimeDiff = initialServerTime.originTime - initialServerTime.correctedOriginTime

      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true }
        }
      })).then(() => browser.waitForAgentLoad())

      const subsequentSession = await browser.getAgentSessionInfo()
      const subsequentServerTime = await browser.getPageTime()
      const subsequentServerTimeDiff = subsequentServerTime.originTime - subsequentServerTime.correctedOriginTime

      expect(subsequentServerTimeDiff).toEqual(initialServerTimeDiff)
      expect(subsequentSession.localStorage.serverTimeDiff).toEqual(initialSession.localStorage.serverTimeDiff)
    })

    it('should re-use the server time diff already calculated when session times out - inactivity', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true },
          session: { inactiveMs: 10000 }
        }
      })).then(() => browser.waitForAgentLoad())

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
      await browser.url(await browser.testHandle.assetURL('instrumented.html', {
        init: {
          privacy: { cookies_enabled: true },
          session: { expiresMs: 10000 }
        }
      })).then(() => browser.waitForAgentLoad())

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

  if (originTime && correctedOriginTime) {
    expect(Math.abs(serverTime - originTime + 3600000)).toBeLessThan(10000) // origin time should be about an hour ahead (3600000 ms)
    expect(Math.abs(serverTime - correctedOriginTime)).toBeLessThan(10000) // corrected origin time should roughly match the server time on our side
    expect(Math.abs(correctedOriginTime - originTime + 3600000)).toBeLessThan(10000)

    expect(Math.abs(timestamp - correctedOriginTime)).toBeLessThan(10000) // should expect a reasonable tolerance (and much less than an hour)
    expect(Math.abs(timestamp - originTime + 3600000)).toBeLessThan(10000) // should expect a reasonable tolerance (and much less than an hour)
    expect(timestamp).toBeGreaterThan(correctedOriginTime)
    expect(timestamp).toBeLessThan(originTime)
  } else {
    // fallback for IE which doesn't work well with grabbing the raw values out
    expect(Math.abs(timestamp - serverTime)).toBeLessThan(10000) // should expect a reasonable tolerance (and much less than an hour)
    if (before) expect(timestamp).toBeLessThan(serverTime)
    else expect(timestamp).toBeGreaterThan(serverTime)
  }
}
