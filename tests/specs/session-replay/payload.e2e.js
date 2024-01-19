import { config, testExpectedReplay } from './helpers'
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('Session Replay Payload Validation', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should allow for gzip', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: harvestContents } = await browser.testHandle.expectBlob()

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
      browser.testHandle.expectBlob(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
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
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: harvestContents } = await browser.testHandle.expectBlob()
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
  })

  it('should match expected payload - error', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const [{ request: harvestContents }] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      })
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: true, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
  })

  it('should handle meta if separated', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const events = await browser.execute(function () {
      var instance = Object.values(newrelic.initializedAgents)[0]
      return instance.features.session_replay.featAggregate.recorder.getEvents().events.filter(x => x.type !== 4)
    })

    expect(events.find(x => x.type === 4)).toEqual(undefined)

    const [{ request: harvestContents }] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      })
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: true, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
  })

  it('should place inlined css for cross origin stylesheets even if no crossOrigin tag', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForFeatureAggregate('session_replay'))

    /** snapshot and mutation payloads */
    const { request: { body: snapshot1 } } = await browser.testHandle.expectBlob()
    const snapshot1Nodes = snapshot1.filter(x => x.type === 2)
    let stylesheetNodesSeen = 0
    snapshot1Nodes.forEach(snapshotNode => {
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const headNode = htmlNode.childNodes.find(x => x.tagName === 'head')
      const linkNodes = headNode.childNodes.filter(x => x.tagName === 'link')
      linkNodes.forEach(linkNode => {
        expect(!!linkNode.attributes._cssText).toEqual(true)
        stylesheetNodesSeen++
      })
    })

    expect(stylesheetNodesSeen).toEqual(2) // loaded 2 stylesheets as part of initial page load
    await browser.pause(5000)
    /** Agent should generate a new snapshot after a new "invalid" stylesheet is injected */
    const [{ request: { body: snapshot2 } }] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.execute(function () {
        document.querySelector('body').click()
      })
    ])
    stylesheetNodesSeen = 0
    const snapshot2Nodes = snapshot2.filter(x => x.type === 2)
    snapshot2Nodes.forEach(snapshotNode => {
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const headNode = htmlNode.childNodes.find(x => x.tagName === 'head')
      const linkNodes = headNode.childNodes.filter(x => x.tagName === 'link')
      linkNodes.forEach(linkNode => {
        expect(!!linkNode.attributes._cssText).toEqual(true)
        stylesheetNodesSeen++
      })
    })
    expect(stylesheetNodesSeen).toEqual(3) // should capture both initial load and injected stylesheets (3)
  })
})
