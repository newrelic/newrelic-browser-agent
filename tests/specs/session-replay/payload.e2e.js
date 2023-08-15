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

    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: harvestContents } = await browser.testHandle.expectBlob()

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

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: false, hasSnapshot: true, isFirstChunk: true })
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

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: true, hasSnapshot: true, isFirstChunk: true })
  })
})
