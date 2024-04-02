import { faker } from '@faker-js/faker'
import { notIE, supportsFetch } from '../../tools/browser-matcher/common-matchers.mjs'
import { config, decodeAttributes } from './session-replay/helpers'

let serverTime
describe('NR Server Time', () => {
  beforeEach(async () => {
    serverTime = await browser.mockDateResponse()
  })

  it('should send jserror with timestamp prior to rum date header', async () => {
    const [errors, timeKeeper] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.url(await browser.testHandle.assetURL('nr-server-time/error-before-load.html'))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getTimeKeeper())
    ])

    const error = errors.request.body.err[0]
    expect(error.params.firstOccurrenceTimestamp).toEqual(error.params.timestamp)
    testTimeExpectations(error.params.timestamp, timeKeeper, true)
  })

  it('should send jserror with timestamp after rum date header', async () => {
    const timeKeeper = await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.getTimeKeeper())

    const [errors] = await Promise.all([
      browser.testHandle.expectErrors(),
      browser.getTimeKeeper(),
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
    serverTime = await browser.mockDateResponse(undefined, { flags: { sr: 1 } })
    const [{ request: replayData }, timeKeeper] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 100, preload: true } })))
        .then(() => browser.waitForSessionReplayRecording())
        .then(() => browser.getTimeKeeper())
    ])

    const attrs = decodeAttributes(replayData.query.attributes)
    const firstTimestamp = attrs['replay.firstTimestamp']
    testTimeExpectations(firstTimestamp, timeKeeper, true)

    await browser.destroyAgentSession()
  })

  it.withBrowsersMatching(notIE)('should send session replay with timestamp after rum date header', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.clearScheduledReplies('bamServer')
    serverTime = await browser.mockDateResponse(undefined, { flags: { sr: 1 } })
    const [{ request: replayData }, timeKeeper] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { sampling_rate: 100, preload: false } })))
        .then(() => browser.waitForSessionReplayRecording())
        .then(() => browser.getTimeKeeper())
    ])
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
        .then(() => browser.getTimeKeeper())
    ])

    const pageAction = pageActions.request.body.ins[0]
    testTimeExpectations(pageAction.timestamp, timeKeeper, true)
  })

  it('should send page action with timestamp after rum date header', async () => {
    const timeKeeper = await browser.url(await browser.testHandle.assetURL('instrumented.html'))
      .then(() => browser.waitForAgentLoad())
      .then(() => browser.getTimeKeeper())

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
        .then(() => browser.getTimeKeeper())
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
      .then(() => browser.getTimeKeeper())

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
})

/**
 *
 * @param {Number} timestamp The timestamp from the event
 * @param {Object} timeKeeper The timekeeper metadata
 * @param {Boolean} before If the timestamp should be evaluated as before or after the local stamp. (This only occurs when test cant get the actual origin times -- ex. IE11)
 */
function testTimeExpectations (timestamp, timeKeeper, before) {
  const { correctedOriginTime, originTime } = (timeKeeper || {})

  if (originTime && correctedOriginTime) {
    expect(Math.abs(serverTime - originTime + 3600000)).toBeLessThan(10000) // origin time should be about an hour ahead (3600000 ms)
    expect(Math.abs(serverTime - correctedOriginTime)).toBeLessThan(10000) // corrected origin time should roughly match the server time on our side

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
