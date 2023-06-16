import { supportsMultipleTabs } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { config, getSR, testExpectedReplay } from './helpers'

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

    const { localStorage } = await browser.getAgentSessionInfo()
    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasSnapshot: true, isFirstChunk: true })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({
        stn: 1,
        err: 1,
        ins: 1,
        cap: 1,
        spa: 1,
        loaded: 1,
        sr: 1
      })
    })
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob()

    testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasSnapshot: true, isFirstChunk: false })
  })

  it('should record across same-tab page navigation', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())
    const { localStorage } = await browser.getAgentSessionInfo()
    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)
    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasSnapshot: true, isFirstChunk: true })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({
        stn: 1,
        err: 1,
        ins: 1,
        cap: 1,
        spa: 1,
        loaded: 1,
        sr: 1
      })
    })
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob(10000)
    testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasSnapshot: true, isFirstChunk: false })
  })

  withBrowsersMatching(supportsMultipleTabs)('should record across new-tab page navigation', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())
    const { localStorage } = await browser.getAgentSessionInfo()
    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasSnapshot: true, isFirstChunk: true })

    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({
        stn: 1,
        err: 1,
        ins: 1,
        cap: 1,
        spa: 1,
        loaded: 1,
        sr: 1
      })
    })
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob(10000)

    testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasSnapshot: true, isFirstChunk: false })

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
  })

  it('should not record across navigations if not active', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())
    const { localStorage } = await browser.getAgentSessionInfo()
    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasSnapshot: true, isFirstChunk: true })

    await browser.execute(function () {
      Object.values(NREUM.initializedAgents)[0].runtime.session.state.sessionReplay = 0
    })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({
        stn: 1,
        err: 1,
        ins: 1,
        cap: 1,
        spa: 1,
        loaded: 1,
        sr: 1
      })
    })
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    const sr = await getSR()

    expect(sr.exists).toEqual(false)
  })
})
