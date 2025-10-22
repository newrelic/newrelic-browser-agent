import { JSONPath } from 'jsonpath-plus'
import { decodeAttributes, srConfig, testExpectedReplay } from '../util/helpers'
import { supportsInliningCrossOriginStylesheets } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testBlobReplayRequest, testRumRequest, testSessionReplaySnapshotRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Session Replay Payload Validation', () => {
  let sessionReplaysCapture

  beforeEach(async () => {
    sessionReplaysCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should use rumResponse agent metadata', async () => {
    const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
    const [rumHarvests, sessionReplayHarvests] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const agentMetadata = JSON.parse(rumHarvests[0].reply.body).app
    testExpectedReplay({ data: sessionReplayHarvests[0].request, entityGuid: agentMetadata.agents[0].entityGuid })
  })

  it('should allow for gzip', async () => {
    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          newrelic.noticeError(new Error('test'))
        }))
    ])

    sessionReplayHarvests.forEach(harvest => {
      expect(harvest.request.query.attributes.includes('content_encoding')).toEqual(true)
      expect(harvest.request.query.attributes.includes('gzip')).toEqual(true)
      expect(Array.isArray(harvest.request.body)).toEqual(true)
      expect(harvest.request.body.length).toBeGreaterThan(0)
      expect(Object.keys(harvest.request.body[0])).toEqual(expect.arrayContaining(['data', 'timestamp', 'type']))
    })
  })

  it('should allow for json', async () => {
    await browser.testHandle.scheduleReply('assetServer', {
      test: function (request) {
        const url = new URL(request.url, 'resolve://')
        return (url.pathname.includes('compressor'))
      },
      statusCode: 500,
      body: ''
    })
    const [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          newrelic.noticeError(new Error('test'))
        }))
    ])

    sessionReplayHarvests.forEach(harvest => {
      expect(harvest.request.query.attributes.includes('content_encoding')).toEqual(false)
      expect(harvest.request.query.attributes.includes('gzip')).toEqual(false)
      expect(Array.isArray(harvest.request.body)).toEqual(true)
      expect(harvest.request.body.length).toBeGreaterThan(0)
      expect(Object.keys(harvest.request.body[0])).toEqual(expect.arrayContaining(['data', 'timestamp', 'type']))
    })
  })

  it('should match expected payload - standard', async () => {
    const [sessionReplayHarvests, { localStorage: { value: session } }] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 2 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getAgentSessionInfo())
    ])

    const firstChunk = sessionReplayHarvests.find(x => x.request.query.attributes.includes('isFirstChunk=true'))

    testExpectedReplay({
      data: firstChunk.request,
      session,
      hasError: false,
      hasMeta: true,
      hasSnapshot: true,
      isFirstChunk: true,
      currentUrl: firstChunk.request.headers.origin + '/tests/assets/rrweb-instrumented.html'
    })
  })

  it('should match expected payload - error', async () => {
    const [sessionReplayHarvests, { localStorage: { value: session } }] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 2 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.getAgentSessionInfo())
    ])

    const firstChunk = sessionReplayHarvests.find(x => x.request.query.attributes.includes('isFirstChunk=true'))

    testExpectedReplay({
      data: firstChunk.request,
      session,
      hasError: false,
      hasMeta: true,
      hasSnapshot: true,
      isFirstChunk: true
    })

    const [errorHarvest] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        document.querySelector('#error-click').click()
      })
    ])

    const errorSessionReplayHarvest = errorHarvest.find(harvest => harvest.request.query.attributes.indexOf('hasError=true') !== -1)
    testExpectedReplay({ data: errorSessionReplayHarvest.request, session, hasError: true, isFirstChunk: false })
  })

  it.withBrowsersMatching(supportsInliningCrossOriginStylesheets)('should place inlined css for cross origin stylesheets even if no crossOrigin tag', async () => {
    const sessionReplaySnapshotCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testSessionReplaySnapshotRequest })

    let [sessionReplaySnapshotHarvests] = await Promise.all([
      sessionReplaySnapshotCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('rrweb-invalid-stylesheet.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    expect(sessionReplaySnapshotHarvests.length).toEqual(1)
    expect(decodeAttributes(sessionReplaySnapshotHarvests[0].request.query.attributes).inlinedAllStylesheets).toEqual(true)

    let linkNodes = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.tagName===\'link\' && @.attributes.type===\'text/css\')]', json: sessionReplaySnapshotHarvests })
    linkNodes.forEach(linkNode => {
      expect(linkNode.attributes._cssText).toEqual(expect.any(String))
      expect(linkNode.attributes._cssText.length).toBeGreaterThan(0)
    })

    await browser.pause(5000)
    /** Agent should generate a new snapshot after a new "invalid" stylesheet is injected */
    ;[sessionReplaySnapshotHarvests] = await Promise.all([
      sessionReplaySnapshotCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        var newelem = document.createElement('span')
        newelem.innerHTML = 'this is some text'
        document.body.appendChild(newelem)
      })
    ])

    expect(sessionReplaySnapshotHarvests.length).toEqual(2)
    expect(decodeAttributes(sessionReplaySnapshotHarvests[1].request.query.attributes).inlinedAllStylesheets).toEqual(true)

    linkNodes = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.tagName===\'link\' && @.attributes.type===\'text/css\')]', json: sessionReplaySnapshotHarvests })
    linkNodes.forEach(linkNode => {
      expect(linkNode.attributes._cssText).toEqual(expect.any(String))
      expect(linkNode.attributes._cssText.length).toBeGreaterThan(0)
    })
  })

  it('should NOT place inlined css for cross origin stylesheets when fix_stylesheets is false', async () => {
    const sessionReplaySnapshotCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testSessionReplaySnapshotRequest })

    let [sessionReplaySnapshotHarvests] = await Promise.all([
      sessionReplaySnapshotCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('rrweb-invalid-stylesheet.html', srConfig({ session_replay: { fix_stylesheets: false, enabled: true } })))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    expect(sessionReplaySnapshotHarvests.length).toEqual(1)
    expect(decodeAttributes(sessionReplaySnapshotHarvests[0].request.query.attributes).inlinedAllStylesheets).toEqual(false)

    const linkNodes = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.tagName===\'link\' && @.attributes.type===\'text/css\')]', json: sessionReplaySnapshotHarvests })
    linkNodes.forEach(linkNode => {
      expect(linkNode.attributes._cssText).toEqual(expect.any(String))
      expect(linkNode.attributes._cssText.length).toBeGreaterThan(0)
    })
  })

  // disabled while on rrweb v2.0.0-alpha.18
  // it('should process large css within timeout threshold', async () => {
  //   const sessionReplaySnapshotCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testSessionReplaySnapshotRequest })
  //
  //   let [sessionReplaySnapshotHarvests] = await Promise.all([
  //     sessionReplaySnapshotCapture.waitForResult({ timeout: 10000 }),
  //     browser.url(await browser.testHandle.assetURL('rrweb-record-large-style-with-textnodes.html', srConfig()))
  //       .then(() => browser.waitForFeatureAggregate('session_replay'))
  //   ])
  //
  //   expect(sessionReplaySnapshotHarvests.length).toEqual(1)
  //   console.log(sessionReplaySnapshotHarvests[0].request.body)
  // })
})
