import { testBlobTraceRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests.js'
import { supportsMultiTabSessions } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testExpectedTrace, stConfig, MODE, decodeAttributes } from '../util/helpers.js'
import { rumFlags } from '../../../tools/testing-server/constants.js'

const getTraceMode = () => browser.execute(function () {
  const agent = Object.values(newrelic.initializedAgents)[0]
  return [
    agent.features.session_trace.featAggregate.mode
  ]
})

describe('Session Replay Across Pages', () => {
  let sessionTraceCapture

  beforeEach(async () => {
    sessionTraceCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobTraceRequest })
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should record across same-tab page refresh when already recording, even if sampling is 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0 }))
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()
    const page1ptid = decodeAttributes(sessionTraceHarvests[0].request.query.attributes).harvestId.split('_')[1]

    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request, session: localStorage.value }))

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sts: 0, sr: 0 }))
    })

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const refreshHarvests = sessionTraceHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).harvestId.indexOf(page1ptid) === -1)
    expect(refreshHarvests.length).toBeGreaterThan(0)
    testExpectedTrace({ data: refreshHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
    refreshHarvests.slice(1).forEach(harvest =>
      testExpectedTrace({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    )
  })

  it('should record across same-tab page navigation when already recording, even if sampling is 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0 }))
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('stn/instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()
    const page1ptid = decodeAttributes(sessionTraceHarvests[0].request.query.attributes).harvestId.split('_')[1]

    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request, session: localStorage.value }))

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sts: 0, sr: 0 }))
    })

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const navigationHarvests = sessionTraceHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).harvestId.indexOf(page1ptid) === -1)
    expect(navigationHarvests.length).toBeGreaterThan(0)
    testExpectedTrace({ data: navigationHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
    navigationHarvests.slice(1).forEach(harvest =>
      testExpectedTrace({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    )
  })

  it.withBrowsersMatching(supportsMultiTabSessions)('should record across new-tab page navigation once recording, even if sampled as 0', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0 }))
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()
    const page1ptid = decodeAttributes(sessionTraceHarvests[0].request.query.attributes).harvestId.split('_')[1]

    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request, session: localStorage.value }))

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0, sts: 0 }))
    })

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.createWindow('tab')
        .then((newTab) => browser.switchToWindow(newTab.handle))
        .then(async () => browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig())))
        .then(() => browser.waitForAgentLoad())
    ])

    const newTabHarvests = sessionTraceHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).harvestId.indexOf(page1ptid) === -1)
    expect(newTabHarvests.length).toBeGreaterThan(0)
    testExpectedTrace({ data: newTabHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
    newTabHarvests.slice(1).forEach(harvest =>
      testExpectedTrace({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    )

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
  })

  it('should not record across navigations if not active', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0 }))
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()
    const page1ptid = decodeAttributes(sessionTraceHarvests[0].request.query.attributes).harvestId.split('_')[1]

    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request, session: localStorage.value }))

    await browser.execute(function () {
      Object.values(NREUM.initializedAgents)[0].runtime.session.state.sessionTraceMode = 0
    })
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0, sts: 0 }))
    })

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.refresh()
        .then(() => browser.waitForAgentLoad())
    ])

    const refreshHarvests = sessionTraceHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).harvestId.indexOf(page1ptid) === -1)
    expect(refreshHarvests.length).toEqual(0)
  })

  it('should not report harvest if sessionId changes', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0 }))
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request, session: localStorage.value }))

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0, sts: 0 }))
    })

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.state.value = 'session_id_changed'
      })
    ])

    const newSessionHarvests = sessionTraceHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).session !== localStorage.value)
    expect(newSessionHarvests.length).toEqual(0)
  })

  it('should not report harvest if session resets', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0 }))
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request, session: localStorage.value }))

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0, sts: 0 }))
    })

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
      })
    ])

    const newSessionHarvests = sessionTraceHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).session !== localStorage.value)
    expect(newSessionHarvests.length).toEqual(0)
  })

  it.withBrowsersMatching(supportsMultiTabSessions)('should not report harvest if session resets on another page', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0 }))
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request, session: localStorage.value }))

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sr: 0 }))
    })

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 15000 }),
      browser.createWindow('tab')
        .then((newTab) => browser.switchToWindow(newTab.handle))
        .then(async () => browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig())))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
        }))
    ])

    let newSessionHarvests = sessionTraceHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).session !== localStorage.value)
    expect(newSessionHarvests.length).toEqual(0)

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.closeWindow()
        .then(async (newTab) => browser.switchToWindow((await browser.getWindowHandles())[0]))
    ])

    newSessionHarvests = sessionTraceHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).session !== localStorage.value)
    expect(newSessionHarvests.length).toEqual(0)
  })

  it.withBrowsersMatching(supportsMultiTabSessions)('catches mode transition from other pages in the session', async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sts: 2, sr: 0 }))
    })

    let [sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionTraceHarvests.length).toEqual(0)
    await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.ERROR))

    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify(rumFlags({ sts: 2, sr: 0 }))
    })

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 15000 }),
      browser.createWindow('tab')
        .then((newTab) => browser.switchToWindow(newTab.handle))
        .then(async () => browser.url(await browser.testHandle.assetURL('instrumented.html', stConfig())))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          newrelic.noticeError('test')
        }))
    ])
    const { localStorage } = await browser.getAgentSessionInfo()
    const page2ptid = decodeAttributes(sessionTraceHarvests[0].request.query.attributes).harvestId.split('_')[1]

    sessionTraceHarvests.forEach(harvest => testExpectedTrace({ data: harvest.request, session: localStorage.value }))

    ;[sessionTraceHarvests] = await Promise.all([
      sessionTraceCapture.waitForResult({ timeout: 10000 }),
      browser.closeWindow()
        .then(async (newTab) => browser.switchToWindow((await browser.getWindowHandles())[0]))
    ])

    await getTraceMode().then(([traceMode]) => expect(traceMode).toEqual(MODE.FULL))
    const page1Harvests = sessionTraceHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).harvestId.indexOf(page2ptid) === -1)
    expect(page1Harvests.length).toBeGreaterThan(0)
    page1Harvests.forEach(harvest => testExpectedTrace({ data: harvest.request, session: localStorage.value }))
  })
})
