import { srConfig, testExpectedReplay } from './helpers'
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('Session Replay Payload Validation', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
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

    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: harvestContents } = await browser.testHandle.expectReplay()

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
      instance.features.session_replay.featAggregate.events = instance.features.session_replay.featAggregate.events.filter(x => x.type !== 4)
      return instance.features.session_replay.featAggregate.events
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
})
