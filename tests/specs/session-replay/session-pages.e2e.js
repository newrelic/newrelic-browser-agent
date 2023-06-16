import { supportsMultipleTabs } from '../../../tools/browser-matcher/common-matchers.mjs'
import { config } from './helpers'

describe('Session Replay Across Pages', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should record across same-tab page refresh', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    expect(page1Contents.query).toMatchObject({
      protocol_version: '0',
      content_encoding: 'gzip',
      browser_monitoring_key: expect.any(String)
    })

    expect(page1Contents.body).toMatchObject({
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

    await browser.enableSessionReplay()
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob()

    expect(page2Contents.query).toMatchObject({
      protocol_version: '0',
      content_encoding: 'gzip',
      browser_monitoring_key: expect.any(String)
    })

    expect(page2Contents.body).toMatchObject({
      type: 'SessionReplay',
      appId: expect.any(Number),
      timestamp: expect.any(Number),
      blob: expect.any(String),
      attributes: {
        session: localStorage.value,
        hasSnapshot: true,
        hasError: false,
        agentVersion: expect.any(String),
        isFirstChunk: false,
        'nr.rrweb.version': expect.any(String)
      }
    })
  })

  it('should record across same-tab page navigation', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    expect(page1Contents.query).toMatchObject({
      protocol_version: '0',
      content_encoding: 'gzip',
      browser_monitoring_key: expect.any(String)
    })

    expect(page1Contents.body).toMatchObject({
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

    await browser.enableSessionReplay()
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob(10000)

    expect(page2Contents.query).toMatchObject({
      protocol_version: '0',
      content_encoding: 'gzip',
      browser_monitoring_key: expect.any(String)
    })

    expect(page2Contents.body).toMatchObject({
      type: 'SessionReplay',
      appId: expect.any(Number),
      timestamp: expect.any(Number),
      blob: expect.any(String),
      attributes: {
        session: localStorage.value,
        hasSnapshot: true,
        hasError: false,
        agentVersion: expect.any(String),
        isFirstChunk: false,
        'nr.rrweb.version': expect.any(String)
      }
    })
  })

  withBrowsersMatching(supportsMultipleTabs)('should record across new-tab page navigation', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    expect(page1Contents.query).toMatchObject({
      protocol_version: '0',
      content_encoding: 'gzip',
      browser_monitoring_key: expect.any(String)
    })

    expect(page1Contents.body).toMatchObject({
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

    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.enableSessionReplay()
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob(10000)

    expect(page2Contents.query).toMatchObject({
      protocol_version: '0',
      content_encoding: 'gzip',
      browser_monitoring_key: expect.any(String)
    })

    expect(page2Contents.body).toMatchObject({
      type: 'SessionReplay',
      appId: expect.any(Number),
      timestamp: expect.any(Number),
      blob: expect.any(String),
      attributes: {
        session: localStorage.value,
        hasSnapshot: true,
        hasError: false,
        agentVersion: expect.any(String),
        isFirstChunk: false,
        'nr.rrweb.version': expect.any(String)
      }
    })

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
  })

  it('should not record across navigations if not active', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    expect(page1Contents.query).toMatchObject({
      protocol_version: '0',
      content_encoding: 'gzip',
      browser_monitoring_key: expect.any(String)
    })

    expect(page1Contents.body).toMatchObject({
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

    await browser.execute(function () {
      Object.values(NREUM.initializedAgents)[0].runtime.session.state.sessionReplay = 0
    })

    await browser.enableSessionReplay()
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    await expect(browser.waitForFeatureAggregate('session_replay', 5000)).rejects.toThrow()
  })
})
