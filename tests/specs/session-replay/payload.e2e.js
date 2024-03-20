import { decodeAttributes, srConfig, testExpectedReplay } from '../util/helpers'
import { notIE, notIOS, notSafari } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('Session Replay Payload Validation', () => {
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

    const { request: harvestContents } = await browser.testHandle.expectBlob()
    const agentMetadata = JSON.parse(rumCall.reply.body).app
    testExpectedReplay({ data: harvestContents, entityGuid: agentMetadata.agents[0].entityGuid })
  })

  it('should allow for gzip', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: harvestContents } = await browser.testHandle.expectReplay()

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
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: harvestContents } = await browser.testHandle.expectReplay()
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
  })

  it('should match expected payload - error', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    const [{ request: harvestContents }] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      })
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: true, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
  })

  it('should handle meta if separated', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    const events = await browser.execute(function () {
      var instance = Object.values(newrelic.initializedAgents)[0]
      return instance.features.session_replay.featAggregate.recorder.getEvents().events.filter(x => x.type !== 4)
    })

    expect(events.find(x => x.type === 4)).toEqual(undefined)

    const [{ request: harvestContents }] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      })
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: true, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
  })

  /**
   * auto-inlining broken stylesheets does not work in safari browsers < 16.3
   * current mitigation strategy is defined as informing customers to add `crossOrigin: anonymous` tags to cross-domain stylesheets
  */
  it.withBrowsersMatching([notSafari, notIOS])('should place inlined css for cross origin stylesheets even if no crossOrigin tag', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-invalid-stylesheet.html', srConfig()))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    /** snapshot and mutation payloads */
    const { request: { body: snapshot1, query: snapshot1Query } } = await browser.testHandle.expectSessionReplaySnapshot(10000)
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
})
