import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { supportsMultipleTabs, notSafari } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testExpectedTrace, stConfig, MODE } from '../util/helpers.js'

const getTraceMode = () => browser.execute(function () {
  const agent = Object.values(newrelic.initializedAgents)[0]
  return [
    agent.features.session_trace.featAggregate.mode
  ]
})

describe('Session Replay Across Pages', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should record across same-tab page refresh when already recording, even if sampling is 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectTrace(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedTrace({ data: page1Contents, session: localStorage.value })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 0, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    const { request: page2Contents } = await browser.testHandle.expectTrace()

    testExpectedTrace({ data: page2Contents, session: localStorage.value })
  })

  it('should record across same-tab page navigation when already recording, even if sampling is 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('stn/instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { localStorage } = await browser.getAgentSessionInfo()
    const { request: page1Contents } = await browser.testHandle.expectTrace(10000)
    testExpectedTrace({ data: page1Contents, session: localStorage.value })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 0, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
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
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectTrace(10000)
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedTrace({ data: page1Contents, session: localStorage.value })

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 0, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
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
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
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
      body: JSON.stringify({ st: 1, sts: 0, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    await browser.testHandle.expectTrace(10000, true)
  })

  it('should not report harvest if sessionId changes', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectTrace(10000)
    const { localStorage: { value: session } } = await browser.getAgentSessionInfo()

    testExpectedTrace({ data: page1Contents, session })

    await Promise.all([
      browser.testHandle.expectTrace(10000, true), // should not harvest again if the session id changes mid-lifecycle
      browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.state.value = 'session_id_changed'
      })
    ])
  })

  it('should not report harvest if session resets', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    const { request: page1Contents } = await browser.testHandle.expectTrace(10000)
    const { localStorage: { value: session } } = await browser.getAgentSessionInfo()

    testExpectedTrace({ data: page1Contents, session })

    await Promise.all([
      browser.testHandle.expectTrace(10000, true), // should not harvest again if the session id changes mid-lifecycle
      browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
      })
    ])
  })

  // As of 06/26/2023 test fails in Safari, though tested behavior works in a live browser (revisit in NR-138940).
  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should not report harvest if session resets on another page', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())
    await browser.testHandle.expectTrace(10000)
    // got a payload, now open a new tab and reset the session in tab B
    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 1, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', stConfig()))
      .then(() => browser.waitForAgentLoad())

    await browser.resetAgentSession()

    // go back to tab A and see if we get another harvest
    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
    await browser.testHandle.expectTrace(10000, true)
  })

  // As of 06/26/2023 test fails in Safari, though tested behavior works in a live browser (revisit in NR-138940).
  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('catches mode transition from other pages in the session', async () => {
    await browser.destroyAgentSession()
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
    })
    let url = await browser.testHandle.assetURL('instrumented.html', stConfig())
    await browser.url(url).then(() => browser.waitForAgentLoad())

    await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.ERROR))

    // await browser.newWindow(await browser.testHandle.assetURL('instrumented.html', stConfig()), { windowName: 'Second page' })
    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({ st: 1, sts: 2, err: 1, ins: 1, spa: 1, sr: 0, loaded: 1 })
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
