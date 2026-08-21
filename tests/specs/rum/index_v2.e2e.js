import { testConnectRequest, testErrorsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

const rumV2Config = { init: { feature_flags: ['rum_v2'] } }

// Loader config that, under v1 (see tests/specs/rum/index.e2e.js's "should capture detailed APM decorations"),
// populates tt/us/ac/pr/xx/ua on the RUM query string. Reused here (merged with rum_v2) so the "removed" assertion
// below is proving those params are actually dropped by aggregate_v2, not just naturally empty in this test config.
const legacyAttributionConfig = {
  config: {
    ttGuid: '21EC2020-3AEA-1069-A2DD-08002B30309D',
    account: 'test_account',
    user: 'test_user',
    product: 'test_product',
    extra: 'test_extra',
    userAttributes: 'test_userAttributes'
  },
  init: rumV2Config.init
}

/**
 * page_view_event's v2 aggregate (src/features/page_view_event/aggregate_v2) replaces the special-cased, immediate,
 * non-retrying v1 RUM call with a payload that goes out over the SAME Harvester#triggerHarvestFor path as any other
 * feature -- see harvestEndpointVersion=2, which routes it to the legacy-shaped /rum/2/:testId endpoint even though
 * it's really just a normal harvester-driven harvest now. Compare against tests/specs/rum/*.e2e.js, which cover the
 * v1-only behaviors this file intentionally does NOT reproduce for v2 (fsh, and RUM failure blocking every other
 * feature). Retry/backoff on a retryable status is generic Harvester behavior (already covered in the harvesting
 * e2e group) and isn't re-tested here; Connector's OWN retry/backoff for the browser/connect/2 call -- a genuinely new
 * logical unit, not shared with the harvester -- is covered separately in tests/specs/connector/index.e2e.js.
 */
describe('page_view_event v2 (rum_v2) harvest behavior', () => {
  let rumCapture

  beforeEach(async () => {
    rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
  })

  afterEach(async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')
    await browser.destroyAgentSession()
  })

  it('drops v1-only attribution/session query params, but still sends the v2-required af and igp', async () => {
    // Under v1 (src/features/page_view_event/aggregate/index.js), sendRum's queryParameters includes tt/us/ac/pr/
    // xx/ua straight from loader config, plus fsh derived from whether a cached RUM response already existed when
    // PVE queried it. aggregate_v2's queryStringsBuilder (src/features/page_view_event/aggregate_v2/index.js)
    // does not build any of these -- fsh is meaningless under v2 since Connector's browser/connect/2 call already writes
    // cachedRumResponse to session storage before ANY aggregate, including PVE-v2 itself, ever harvests (even on
    // a page's first-ever load); the loader-config attribution params (tt/us/ac/pr/xx/ua) aren't read at all.
    const connectCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testConnectRequest })

    const [[rumHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', legacyAttributionConfig))
        .then(() => browser.waitForAgentLoad())
    ])

    const removedV1Params = ['tt', 'us', 'ac', 'pr', 'xx', 'ua', 'fsh']
    removedV1Params.forEach(key => expect(rumHarvest.request.query[key]).toBeUndefined())

    // af (activated feature flags) is still built by aggregate_v2 the same way v1 did.
    expect(rumHarvest.request.query.af).toBeTruthy()

    // igp is v2-only -- sourced from Connector's browser/connect/2 response (app.igp) rather than any loader/legacy RUM
    // concept -- and must survive the query string's URI encode/decode round trip unchanged.
    const [connectHarvest] = await connectCapture.waitForResult({ totalCount: 1 })
    const connectReplyBody = JSON.parse(connectHarvest.reply.body)
    expect(rumHarvest.request.query.igp).toBeTruthy()
    expect(decodeURIComponent(rumHarvest.request.query.igp)).toEqual(connectReplyBody.app.igp)
  })

  it('sends the same igp on a page reload within an existing session, sourced from the cached connect response rather than a new connect call', async () => {
    const connectCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testConnectRequest })

    const [[firstRumHarvest], [firstConnectHarvest]] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      connectCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', rumV2Config))
        .then(() => browser.waitForAgentLoad())
    ])
    const firstIgp = firstRumHarvest.request.query.igp
    expect(firstIgp).toBeTruthy()

    // If session caching were broken and a second browser/connect/2 call actually went out on reload, it would land here
    // and get back a DIFFERENT igp than the first -- so this is a real regression check on the caching itself, not
    // just an assertion that happens to pass because the mock server would otherwise always reply with same igp.
    const decoyIgp = 'decoy-igp-should-never-be-used'
    const decoyConnectResponse = JSON.parse(firstConnectHarvest.reply.body)
    decoyConnectResponse.app.igp = decoyIgp
    await browser.testHandle.scheduleReply('bamServer', {
      test: testConnectRequest,
      statusCode: 200,
      body: JSON.stringify(decoyConnectResponse),
      permanent: false
    })

    // Reload within the SAME session (localStorage persists across same-origin navigations by default) -- Connector
    // should reuse session.state.cachedRumResponse instead of connecting again (see tests/specs/connector/index.e2e.js
    // for that behavior in isolation), and PVE-v2 should read the exact same igp back off that cached response.
    const [rumHarvests] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 2 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', rumV2Config))
        .then(() => browser.waitForAgentLoad())
    ])
    const secondRumHarvest = rumHarvests[1]

    expect(secondRumHarvest.request.query.igp).toEqual(firstIgp)
    expect(secondRumHarvest.request.query.igp).not.toEqual(decoyIgp)

    const connectHarvests = await connectCapture.waitForResult({ timeout: 3000 })
    expect(connectHarvests.length).toEqual(1)
  })

  ;[400, 404].forEach(statusCode => {
    it(`drops the page view payload without retrying or aborting the agent on a non-retryable status (${statusCode}), while other features keep harvesting`, async () => {
      const errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        permanent: true,
        statusCode,
        body: ''
      })

      const [rumHarvests] = await Promise.all([
        rumCapture.waitForResult({ timeout: 10000 }),
        browser.url(await browser.testHandle.assetURL('instrumented.html', rumV2Config))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () { newrelic.noticeError(new Error('hippo hangry')) }))
      ])

      // Unlike v1 (see tests/specs/rum/retry-harvesting.e2e.js), a failed PVE-v2 harvest does not gate or abort
      // anything else -- it's just one feature's harvest among many, so it fails on its own and nothing retries it
      // (there's no more data queued for it to send again; see AggregateBase#postHarvestCleanup).
      expect(rumHarvests.length).toEqual(1)
      expect(rumHarvests[0].reply.statusCode).toEqual(statusCode)

      const aborted = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].ee.aborted
      })
      expect(aborted).toEqual(false)

      const [errorsHarvest] = await errorsCapture.waitForResult({ totalCount: 1, timeout: 10000 })
      expect(errorsHarvest.reply.statusCode).toEqual(200)
      expect(errorsHarvest.request.body.err).toEqual(expect.arrayContaining([
        expect.objectContaining({ params: expect.objectContaining({ message: 'hippo hangry' }) })
      ]))
    })
  })
})
