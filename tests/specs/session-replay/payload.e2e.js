import { config, testExpectedReplay } from './helpers'
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('Session Replay Payload Validation', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should be gzipped', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: harvestContents } = await browser.testHandle.expectBlob()

    expect((
      harvestContents.query.attributes.includes('content_encoding') &&
      harvestContents.query.attributes.includes('gzip')
    )).toEqual(true)
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
