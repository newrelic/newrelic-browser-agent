import { decodeAttributes, srConfig, testExpectedReplay } from '../util/helpers'
import { notIOS, notSafari } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('Session Replay Payload Validation', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should use rumResponse agent metadata', async () => {
    const [rumCall] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const { request: harvestContents } = await browser.testHandle.expectReplay()
    const agentMetadata = JSON.parse(rumCall.reply.body).app
    testExpectedReplay({ data: harvestContents, entityGuid: agentMetadata.agents[0].entityGuid })
  })

  it('should allow for gzip', async () => {
    const [{ request: harvestContents }] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          newrelic.noticeError(new Error('test'))
        }))
    ])

    expect((
      harvestContents.query.attributes.includes('content_encoding') &&
      harvestContents.query.attributes.includes('gzip')
    )).toEqual(true)

    expect(Array.isArray(harvestContents.body)).toEqual(true)
    expect(harvestContents.body.length).toBeGreaterThan(0)
    expect(Object.keys(harvestContents.body[0])).toEqual(expect.arrayContaining(['data', 'timestamp', 'type']))
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

    const [{ request: harvestContents }] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    expect((
      harvestContents.query.attributes.includes('content_encoding') ||
      harvestContents.query.attributes.includes('gzip')
    )).toEqual(false)

    expect(Array.isArray(harvestContents.body)).toEqual(true)
    expect(harvestContents.body.length).toBeGreaterThan(0)
    expect(Object.keys(harvestContents.body[0])).toEqual(expect.arrayContaining(['data', 'timestamp', 'type']))
  })

  it('should match expected payload - standard', async () => {
    const [{ request: harvestContents }] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
  })

  it('should match expected payload - error', async () => {
    const [{ request: harvestContents1 }, { request: harvestContents2 }] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          newrelic.noticeError(new Error('test'))
        }))
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: harvestContents1, session: localStorage.value, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
    testExpectedReplay({ data: harvestContents2, session: localStorage.value, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    const hasError = decodeAttributes(harvestContents1.query.attributes).hasError || decodeAttributes(harvestContents2.query.attributes).hasError
    expect(hasError).toBeTruthy()
  })

  /**
   * auto-inlining broken stylesheets does not work in safari browsers < 16.3
   * current mitigation strategy is defined as informing customers to add `crossOrigin: anonymous` tags to cross-domain stylesheets
  */
  it.withBrowsersMatching([notSafari, notIOS])('should place inlined css for cross origin stylesheets even if no crossOrigin tag', async () => {
    /** snapshot and mutation payloads */
    const [{ request: { body: snapshot1, query: snapshot1Query } }] = await Promise.all([
      browser.testHandle.expectSessionReplaySnapshot(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-invalid-stylesheet.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])
    const snapshot1Nodes = snapshot1.filter(x => x.type === 2)
    expect(decodeAttributes(snapshot1Query.attributes).inlinedAllStylesheets).toEqual(true)
    snapshot1Nodes.forEach(snapshotNode => {
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const headNode = htmlNode.childNodes.find(x => x.tagName === 'head')
      const linkNodes = headNode.childNodes.filter(x => x.tagName === 'link')
      linkNodes.forEach(linkNode => {
        expect(!!linkNode.attributes._cssText).toEqual(true)
      })
    })
    await browser.pause(5000)
    /** Agent should generate a new snapshot after a new "invalid" stylesheet is injected */
    const [{ request: { body: snapshot2, query: snapshot2Query } }] = await Promise.all([
      browser.testHandle.expectSessionReplaySnapshot(10000),
      browser.execute(function () {
        var newelem = document.createElement('span')
        newelem.innerHTML = 'this is some text'
        document.body.appendChild(newelem)
      })
    ])
    expect(decodeAttributes(snapshot2Query.attributes).inlinedAllStylesheets).toEqual(true)
    const snapshot2Nodes = snapshot2.filter(x => x.type === 2)
    snapshot2Nodes.forEach(snapshotNode => {
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const headNode = htmlNode.childNodes.find(x => x.tagName === 'head')
      const linkNodes = headNode.childNodes.filter(x => x.tagName === 'link')
      linkNodes.forEach(linkNode => {
        expect(!!linkNode.attributes._cssText).toEqual(true)
      })
    })
  })

  it.withBrowsersMatching([notSafari, notIOS])('should NOT place inlined css for cross origin stylesheets when fix_stylesheets is false', async () => {
    /** snapshot and mutation payloads */
    const [{ request: { query: snapshot1Query } }] = await Promise.all([
      browser.testHandle.expectSessionReplaySnapshot(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-invalid-stylesheet.html', srConfig({ session_replay: { fix_stylesheets: false, enabled: true, harvestTimeSeconds: 5 } })))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])
    expect(decodeAttributes(snapshot1Query.attributes).inlinedAllStylesheets).toEqual(false)
  })
})
