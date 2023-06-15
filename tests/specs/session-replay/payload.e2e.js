import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { config } from './helpers'

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

    expect(harvestContents.query).toMatchObject({
      protocol_version: '0',
      content_encoding: 'gzip',
      browser_monitoring_key: expect.any(String)
    })

    expect(harvestContents.body).toMatchObject({
      type: 'SessionReplay',
      appId: expect.any(Number),
      timestamp: expect.any(Number),
      blob: expect.any(String),
      attributes: {
        session: localStorage.value,
        hasSnapshot: true,
        hasError: false,
        agentVersion: expect.any(String),
        isFirstChunk: true,
        'nr.rrweb.version': expect.any(String)
      }
    })
  })

  it('should match expected payload - error', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())
    const { localStorage } = await browser.getAgentSessionInfo()
    await browser.execute(function () {
      newrelic.noticeError(new Error('test'))
    })
    const { request: harvestContents } = await browser.testHandle.expectBlob()

    expect(harvestContents.query).toMatchObject({
      protocol_version: '0',
      content_encoding: 'gzip',
      browser_monitoring_key: expect.any(String)
    })

    expect(harvestContents.body).toMatchObject({
      type: 'SessionReplay',
      appId: expect.any(Number),
      timestamp: expect.any(Number),
      blob: expect.any(String),
      attributes: {
        session: localStorage.value,
        hasSnapshot: true,
        hasError: true,
        agentVersion: expect.any(String),
        isFirstChunk: true,
        'nr.rrweb.version': expect.any(String)
      }
    })
  })
})
