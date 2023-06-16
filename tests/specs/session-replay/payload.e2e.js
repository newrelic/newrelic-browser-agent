import { config, testExpectedReplay } from './helpers'

describe('Session Replay Payload Validation', () => {
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

    expect(harvestContents.query.content_encoding).toEqual('gzip')
  })

  it('should match expected payload - standard', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())
    const { localStorage } = await browser.getAgentSessionInfo()
    const { request: harvestContents } = await browser.testHandle.expectBlob()

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: false, hasSnapshot: true, isFirstChunk: true })
  })

  it('should match expected payload - error', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())
    const { localStorage } = await browser.getAgentSessionInfo()
    await browser.execute(function () {
      newrelic.noticeError(new Error('test'))
    })
    const { request: harvestContents } = await browser.testHandle.expectBlob()

    testExpectedReplay({ data: harvestContents, session: localStorage.value, hasError: true, hasSnapshot: true, isFirstChunk: true })
  })
})
