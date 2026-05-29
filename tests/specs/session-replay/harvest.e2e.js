import { notIOS, onlyChrome } from '../../../tools/browser-matcher/common-matchers.mjs'
import { srConfig, decodeAttributes, getSR, testExpectedReplay } from '../util/helpers'
import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Session Replay Harvest Behavior', () => {
  let sessionReplaysCapture

  beforeEach(async () => {
    sessionReplaysCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  // Size based harvest tests below have trouble loading/working on iOS

  it.withBrowsersMatching(notIOS)('should harvest early if exceeds preferred size', async () => {
    const start = Date.now()
    const [[{ request: blobHarvest }]] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', srConfig({ harvester: { interval: 60 } })))
        .then(() => browser.waitForSessionReplayRecording())
    ])

    const end = Date.now()

    expect(blobHarvest.body.length).toBeGreaterThan(0)
    expect(end - start).toBeLessThan(60000)
  })

  /** Some of the other browsers can crash with the way we load this massive page. need to reconsider this test at some point */
  it.withBrowsersMatching(onlyChrome)('should abort if exceeds maximum size', async () => {
    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('1mb-dom.html', srConfig()))
    ])

    expect(sessionReplayHarvests.length).toEqual(0)
    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      blocked: true,
      initialized: true
    }))
  })

  it.withBrowsersMatching(notIOS)('should set timestamps on each payload', async () => {
    await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1, timeout: 10000 }), // snapshot, type = 2
      browser.url(await browser.testHandle.assetURL('64kb-dom.html', srConfig()))
    ])

    // generate a second payload by clicking on an element
    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 2, timeout: 10000 }), // mutation, type = 3
      browser.execute(function () {
        document.getElementById('foobar').click()
      })
    ])

    expect(sessionReplayHarvests[0].request.body.length).toBeGreaterThan(0)
    const attr1 = decodeAttributes(sessionReplayHarvests[0].request.query.attributes)
    expect(attr1['replay.firstTimestamp']).toBeGreaterThan(0)
    expect(attr1['replay.lastTimestamp']).toBeGreaterThan(0)
    expect(attr1['replay.firstTimestamp']).toEqual(sessionReplayHarvests[0].request.body[0].timestamp)
    expect(attr1['replay.lastTimestamp']).toEqual(sessionReplayHarvests[0].request.body[sessionReplayHarvests[0].request.body.length - 1].timestamp)
    expect(attr1['session.durationMs']).toBeGreaterThan(0)

    expect(sessionReplayHarvests[1].request.body.length).toBeGreaterThan(0)
    const attr2 = decodeAttributes(sessionReplayHarvests[1].request.query.attributes)
    expect(attr2['replay.firstTimestamp']).toBeGreaterThan(0)
    expect(attr2['replay.lastTimestamp']).toBeGreaterThan(0)
    expect(attr2['replay.firstTimestamp']).toEqual(sessionReplayHarvests[1].request.body[0].timestamp)
    expect(attr2['replay.lastTimestamp']).toEqual(sessionReplayHarvests[1].request.body[sessionReplayHarvests[1].request.body.length - 1].timestamp)
    expect(attr2['session.durationMs']).toBeGreaterThan(0)

    expect(attr1['replay.firstTimestamp']).not.toEqual(attr2['replay.firstTimestamp'])
    expect(attr1['replay.lastTimestamp']).not.toEqual(attr2['replay.lastTimestamp'])

    expect(parseInt(sessionReplayHarvests[0].request.query.timestamp, 10)).toEqual(attr1['replay.firstTimestamp'])
    expect(parseInt(sessionReplayHarvests[1].request.query.timestamp, 10)).toEqual(attr2['replay.firstTimestamp'])
  })

  it('should use sendBeacon for unload harvests', async () => {
    await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ harvester: { interval: 30 } })))
        .then(() => browser.execute(function () {
          const sendBeaconFn = navigator.sendBeacon.bind(navigator)
          navigator.sendBeacon = function (url, body) {
            sendBeaconFn.call(navigator, url + '&sendBeacon=true', body)
          }
        }))
    ])

    await browser.execute(function () {
      var newelem = document.createElement('span')
      newelem.innerHTML = 'this is some text'
      document.body.appendChild(newelem)
    })

    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])

    expect(sessionReplayHarvests.length).toBeGreaterThan(1)
    expect(sessionReplayHarvests[sessionReplayHarvests.length - 1].request.query.sendBeacon).toEqual('true')
  })

  describe('Retry Payload Integrity', () => {
    it('should retry failed payload successfully on next harvest', async () => {
      // Schedule the first harvest to fail with 500
      await browser.testHandle.scheduleReply('bamServer', {
        test: testBlobReplayRequest,
        statusCode: 500
      })

      const [firstHarvest] = await Promise.all([
        sessionReplaysCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
          .then(() => browser.waitForSessionReplayRecording())
      ])

      expect(firstHarvest[0].reply.statusCode).toEqual(500)
      const failedPayload = firstHarvest[0].request

      // Verify the payload has expected structure even though it failed
      expect(failedPayload.body).toEqual(expect.any(Array))
      expect(failedPayload.body.length).toBeGreaterThan(0)
      expect(failedPayload.query.attributes).toBeDefined()
      const failedAttrs = decodeAttributes(failedPayload.query.attributes)
      expect(failedAttrs['replay.firstTimestamp']).toBeGreaterThan(0)
      expect(failedAttrs['replay.lastTimestamp']).toBeGreaterThan(0)

      // Clear the scheduled reply so next harvest can succeed
      await browser.testHandle.clearScheduledReplies('bamServer')

      // Wait for the next harvest (triggered by harvest interval)
      const [secondHarvest] = await Promise.all([
        sessionReplaysCapture.waitForResult({ totalCount: 2, timeout: 10000 })
      ])

      // Find the successful retry harvest
      const successfulRetryHarvest = secondHarvest.find(harvest => harvest.reply.statusCode === 200)
      expect(successfulRetryHarvest).toBeDefined()

      // Verify the retried payload contains the same data as the failed payload
      expect(successfulRetryHarvest.request.body).toEqual(failedPayload.body)
      expect(successfulRetryHarvest.request.query.attributes).toEqual(failedPayload.query.attributes)
      expect(successfulRetryHarvest.request.query.timestamp).toEqual(failedPayload.query.timestamp)
    })

    it('should preserve payload structure across retry attempts', async () => {
      // Schedule multiple failures
      await browser.testHandle.scheduleReply('bamServer', {
        test: testBlobReplayRequest,
        statusCode: 502,
        permanent: false
      })

      const [harvests] = await Promise.all([
        sessionReplaysCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
          .then(() => browser.waitForSessionReplayRecording())
      ])

      const failedHarvest = harvests.find(h => h.reply.statusCode === 502)
      expect(failedHarvest).toBeDefined()

      // Validate that failed payload maintains proper structure
      testExpectedReplay({
        data: failedHarvest.request,
        hasMeta: true,
        hasSnapshot: true,
        isFirstChunk: true
      })
    })

    it('should handle successful harvest after clearing retryPayload', async () => {
      // First harvest succeeds normally
      const [firstHarvest] = await Promise.all([
        sessionReplaysCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
          .then(() => browser.waitForSessionReplayRecording())
      ])

      expect(firstHarvest[0].reply.statusCode).toEqual(200)

      // Generate another event
      const [secondHarvest] = await Promise.all([
        sessionReplaysCapture.waitForResult({ totalCount: 2, timeout: 10000 }),
        browser.execute(function () {
          document.body.click()
        })
      ])

      const successfulSecondHarvest = secondHarvest[1]
      expect(successfulSecondHarvest).toBeDefined()
      expect(successfulSecondHarvest.request.body.length).toBeGreaterThan(0)

      // Verify payloads are different (not retrying same payload)
      expect(successfulSecondHarvest.request.body).not.toEqual(firstHarvest[0].request.body)
    })
  })
})
