import { testConnectRequest, testMetricsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

const rumV2Config = { init: { feature_flags: ['rum_v2'] } }

// A custom connect matcher that excludes CORS preflight (OPTIONS) requests. The retry tests below add a
// non-simple header, which triggers a preflight to the same /browser/connect/2/:testId path -- with the
// path-only testConnectRequest matcher, that preflight would either be miscounted as an extra connect attempt in
// a capture, OR (worse, for scheduleReply) get hijacked into returning the SCHEDULED FAILURE status itself,
// which fails the preflight and silently blocks the real retry POST from ever being sent. So this matcher is
// used for both capturing AND scheduling replies in any test here that involves a retry. Test-handle serializes
// `test` functions across a process boundary (see expect-tests.js), so this must stay self-contained rather
// than delegating to the imported matcher.
function testConnectPostRequest (request) {
  const url = new URL(request.url, 'resolve://')
  return url.pathname === `/browser/connect/2/${this.testId}` && request.method === 'POST'
}

describe('Connector (rum_v2 browser connect)', () => {
  afterEach(async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')
    await browser.destroyAgentSession()
  })

  it('sends a connect request, activates features from its response, and feeds its igp token to the v2 page view harvest', async () => {
    const [connectCapture, rumCapture, metricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testConnectRequest },
      { test: testRumRequest }, // under rum_v2, page_view_event's aggregate_v2 still delivers over /rum/2/ -- but via the normal harvester cycle (harvestEndpointVersion 2), not a special immediate RUM call like v1
      { test: testMetricsRequest }
    ])

    const [[connectHarvest]] = await Promise.all([
      connectCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', rumV2Config))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(connectHarvest.request.query.a).toBeTruthy() // applicationID
    expect(connectHarvest.request.query.v).toBeTruthy() // agent version
    expect(connectHarvest.request.query.s).toBeTruthy() // session ID
    expect(connectHarvest.reply.statusCode).toEqual(200)
    const connectReplyBody = JSON.parse(connectHarvest.reply.body)
    expect(connectReplyBody).toEqual(expect.objectContaining({
      config: expect.objectContaining({
        err: expect.any(Number),
        ins: expect.any(Number),
        spa: expect.any(Number),
        sr: expect.any(Number),
        srs: expect.any(Number),
        st: expect.any(Number),
        sts: expect.any(Number)
      }),
      app: expect.objectContaining({
        agents: expect.arrayContaining([expect.objectContaining({ entityGuid: expect.any(String) })]),
        nrServerTime: expect.any(Number),
        igp: expect.any(String)
      })
    }))

    // activateFeatures having run is what let waitForAgentLoad above resolve; the harvester should also now be
    // running as a result, so a normal feature (metrics) harvest still goes out on the final (unload) harvest.
    const [metricsHarvests, rumHarvests] = await Promise.all([
      metricsCapture.waitForResult({ timeout: 10000 }),
      rumCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('/'))
    ])
    expect(metricsHarvests[0].request.body.sm.length).toBeGreaterThan(0)

    // page_view_event's v2 aggregate reads the igp token straight off Connector's applied appMetadata -- proving
    // the two features are actually wired together through the bootstrap, not just independently functional.
    expect(rumHarvests[0].request.query.igp).toEqual(connectReplyBody.app.igp)
  })

  it('reuses the cached connect response on a later navigation within the same session instead of connecting again', async () => {
    const connectCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testConnectRequest })

    await browser.url(await browser.testHandle.assetURL('instrumented.html', rumV2Config))
      .then(() => browser.waitForAgentLoad())

    const [firstConnectHarvest] = await connectCapture.waitForResult({ totalCount: 1 })

    const cachedBeforeNav = await browser.execute(function () {
      return Object.values(newrelic.initializedAgents)[0].runtime.session.state.cachedRumResponse
    })
    expect(cachedBeforeNav).toEqual(expect.objectContaining({ config: expect.any(Object) }))

    // Reload within the SAME session (localStorage persists across a refresh by default)
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    // Give a would-be second connect request a chance to land, then confirm it never did.
    const allConnectHarvests = await connectCapture.waitForResult({ timeout: 3000 })
    expect(allConnectHarvests.length).toEqual(1)
    expect(allConnectHarvests[0]).toEqual(firstConnectHarvest)

    const activatedAfterNav = await browser.execute(function () {
      return !!Object.values(newrelic.initializedAgents)[0].runtime.activatedFeatures
    })
    expect(activatedAfterNav).toEqual(true)
  })

  it('retries a retryable connect failure twice, with correctly incrementing headers, before eventually succeeding', async () => {
    // Use a POST-only matcher: each retry attempt below adds a non-simple header, which triggers a CORS
    // preflight OPTIONS request to the same path that would otherwise be miscounted as extra connect attempts.
    const connectCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testConnectPostRequest })
    // Scheduled replies are consumed in the order they were added (one per matching request, see
    // TestHandle#processRequest), so these two queue up and fail the first two attempts; the third goes through
    // to the real handler and succeeds. The second failure uses a DIFFERENT retryable status (502, not 500) than
    // the first, so the X-Previous-Status assertion below is proving it reflects the immediately preceding
    // attempt's actual status rather than happening to match because both failures used the same code.
    await browser.testHandle.scheduleReply('bamServer', { test: testConnectPostRequest, statusCode: 500, body: '', permanent: false })
    await browser.testHandle.scheduleReply('bamServer', { test: testConnectPostRequest, statusCode: 502, body: '', permanent: false })

    await browser.url(await browser.testHandle.assetURL('instrumented.html', rumV2Config))

    // Two backoff rounds (up to ~3s then ~6s, see CONNECT_RETRY_BASE_MS in connector.js) can push this well past
    // waitForAgentLoad's fixed 30s cap, so wait directly on the connect capture with a more generous budget instead.
    const connectHarvests = await connectCapture.waitForResult({ totalCount: 3, timeout: 25000 })

    expect(connectHarvests[0].reply.statusCode).toEqual(500)
    expect(connectHarvests[0].request.headers['x-retry-count']).toBeUndefined() // the initial attempt carries no retry headers

    expect(connectHarvests[1].reply.statusCode).toEqual(502)
    expect(connectHarvests[1].request.headers['x-retry-count']).toEqual('1')
    expect(connectHarvests[1].request.headers['x-previous-status']).toEqual('500')

    expect(connectHarvests[2].reply.statusCode).toEqual(200)
    expect(connectHarvests[2].request.headers['x-retry-count']).toEqual('2')
    expect(connectHarvests[2].request.headers['x-previous-status']).toEqual('502')

    // Confirm nothing beyond the 3 attempts that were actually needed ever went out.
    const settledConnectHarvests = await connectCapture.waitForResult({ timeout: 3000 })
    expect(settledConnectHarvests.length).toEqual(3)

    const activated = await browser.waitUntil(
      () => browser.execute(function () {
        return !!Object.values(newrelic.initializedAgents)[0].runtime.activatedFeatures
      }),
      { timeout: 5000, timeoutMsg: 'features never activated after connect eventually succeeded' }
    )
    expect(activated).toEqual(true)
  })

  it('gives up after exhausting the max retry attempts (3) and aborts, without ever attempting a 4th connect call', async () => {
    const connectCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testConnectPostRequest })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testConnectPostRequest,
      statusCode: 500,
      body: '',
      permanent: true // every attempt fails; there's no 4th attempt to consume this after the 3rd anyway
    })

    await browser.url(await browser.testHandle.assetURL('instrumented.html', rumV2Config))
      .then(() => browser.waitUntil(
        () => browser.execute(function () {
          return Object.values(newrelic.initializedAgents)[0]?.ee.aborted
        }),
        { timeout: 20000, timeoutMsg: 'agent never aborted after exhausting connect retries' }
      ))

    // MAX_CONNECT_ATTEMPTS is 3 in connector.js: the initial attempt plus retries at numOfAttempts 1 and 2. The
    // 3rd failure increments numOfAttempts to 3, which fails the `< MAX_CONNECT_ATTEMPTS` check, so no 3rd retry
    // (4th network call) is ever made -- it falls through to the same hard-failure/abort path as a 4xx.
    const connectHarvests = await connectCapture.waitForResult({ timeout: 15000 })
    expect(connectHarvests.length).toEqual(3)
    connectHarvests.forEach(harvest => expect(harvest.reply.statusCode).toEqual(500))
    expect(connectHarvests[1].request.headers['x-retry-count']).toEqual('1')
    expect(connectHarvests[2].request.headers['x-retry-count']).toEqual('2')

    // Give a would-be 4th attempt a chance to land, then confirm it never did.
    const settledConnectHarvests = await connectCapture.waitForResult({ timeout: 5000 })
    expect(settledConnectHarvests.length).toEqual(3)

    const activated = await browser.execute(function () {
      return !!Object.values(newrelic.initializedAgents)[0].runtime.activatedFeatures
    })
    expect(activated).toEqual(false)
  })

  it('aborts the agent and stops all further harvesting when the connect request fails with a non-retryable status (400)', async () => {
    const [connectCapture, metricsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
      { test: testConnectRequest },
      { test: testMetricsRequest }
    ])
    await browser.testHandle.scheduleReply('bamServer', {
      test: testConnectRequest,
      statusCode: 400,
      body: '',
      permanent: true
    })

    await browser.url(await browser.testHandle.assetURL('instrumented.html', rumV2Config))
      .then(() => browser.waitUntil(
        () => browser.execute(function () {
          return Object.values(newrelic.initializedAgents)[0]?.ee.aborted
        }),
        { timeout: 15000, timeoutMsg: 'agent never aborted after failed connect' }
      ))

    const connectHarvests = await connectCapture.waitForResult({ timeout: 3000 })
    expect(connectHarvests.length).toEqual(1)
    expect(connectHarvests[0].reply.statusCode).toEqual(400)

    const activated = await browser.execute(function () {
      return !!Object.values(newrelic.initializedAgents)[0].runtime.activatedFeatures
    })
    expect(activated).toEqual(false)

    // Only the BCS-error supportability metrics (sent directly by Connector, bypassing the harvester) should go
    // out; the metrics feature itself was never activated, so its normal harvester-driven harvest never fires.
    const metricsHarvests = await metricsCapture.waitForResult({ timeout: 3000 })
    expect(metricsHarvests.length).toEqual(1)
    expect(metricsHarvests[0].request.body.sm).toEqual(expect.arrayContaining([
      expect.objectContaining({ params: expect.objectContaining({ name: 'BCS/Error/400' }) })
    ]))
  })
})
