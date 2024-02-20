import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { supportsMultipleTabs, notIE, notSafari } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testExpectedTrace, stConfig, MODE } from '../util/helpers.js'

const getTraceMode = () => browser.execute(function () {
  const agent = Object.values(newrelic.initializedAgents)[0]
  return [
    agent.features.session_trace.featAggregate.mode
  ]
})

describe.withBrowsersMatching(notIE)('Session Replay Across Pages', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should record across same-tab page refresh when already recording, even if sampling is 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 1, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectTrace(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedTrace({ data: page1Contents, session: localStorage.value })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 0, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectTrace()

    testExpectedTrace({ data: page2Contents, session: localStorage.value })
  })

  it('should record across same-tab page navigation when already recording, even if sampling is 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 1, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('stn/instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { localStorage } = await browser.getAgentSessionInfo()
    const { request: page1Contents } = await browser.testHandle.expectTrace(10000)
    testExpectedTrace({ data: page1Contents, session: localStorage.value })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 0, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })

    await browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectTrace(10000)
    testExpectedTrace({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
  })

  //   // As of 06/26/2023 test fails in Safari, though tested behavior works in a live browser (revisit in NR-138940).
  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should record across new-tab page navigation once recording, even if sampled as 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 1, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectTrace(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedTrace({ data: page1Contents, session: localStorage.value })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 0, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectTrace(10000)

    testExpectedTrace({ data: page2Contents, session: localStorage.value })

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
  })

  it('should not record across navigations if not active', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 1, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectTrace(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedTrace({ data: page1Contents, session: localStorage.value })

    await browser.execute(function () {
      Object.values(NREUM.initializedAgents)[0].runtime.session.state.sessionTraceMode = 0
    })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 0, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectTrace(10000, true)
  })

  it.withBrowsersMatching(supportsMultipleTabs)('catches mode transition from other pages in the session', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 2, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.ERROR))

    // await browser.newWindow(await browser.testHandle.assetURL('instrumented.html', stConfig()), { windowName: 'Second page' })
    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ stn: 2, ste: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    await Promise.all([
      browser.execute(function () {
        newrelic.noticeError('test')
      })
    ])

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
    await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.FULL))
  })
})
