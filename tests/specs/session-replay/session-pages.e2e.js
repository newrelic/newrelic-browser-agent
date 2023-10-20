import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { config, getSR, testExpectedReplay } from './helpers'
import { supportsMultipleTabs, notIE, notSafari } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('Session Replay Across Pages', () => {
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

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    await browser.enableSessionReplay()
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob()

    testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
  })

  it('should record across same-tab page navigation', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { localStorage } = await browser.getAgentSessionInfo()
    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)
    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

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

    await browser.enableSessionReplay()

    await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob(10000)
    testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
  })

  // As of 06/26/2023 test fails in Safari, though tested behavior works in a live browser (revisit in NR-138940).
  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should record across new-tab page navigation', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.enableSessionReplay()
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob(10000)

    testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
  })

  it('should not record across navigations if not active', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    await browser.execute(function () {
      Object.values(NREUM.initializedAgents)[0].runtime.session.state.sessionReplayMode = 0
    })

    await browser.enableSessionReplay()
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    await expect(browser.waitForFeatureAggregate('session_replay', 5000)).rejects.toThrow()
  })

  // As of 06/26/2023 test fails in Safari, though tested behavior works in a live browser (revisit in NR-138940).
  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should kill active tab if killed in backgrounded tab', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectBlob(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.enableSessionReplay()
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectBlob(10000)

    testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })

    const page2Blocked = await browser.execute(function () {
      try {
        var agg = Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate
        agg.abort()
        return agg.blocked
      } catch (err) {
        return false
      }
    })
    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])

    expect(page2Blocked).toEqual(true)
    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      events: [],
      initialized: true,
      recording: false,
      mode: 0,
      blocked: true
    }))
  })
})
