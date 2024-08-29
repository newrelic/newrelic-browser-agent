import { srConfig, getSR, testExpectedReplay, decodeAttributes } from '../util/helpers'
import { supportsMultiTabSessions } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Session Replay Across Pages', () => {
  let sessionReplaysCapture

  beforeEach(async () => {
    sessionReplaysCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should record across same-tab page refresh', async () => {
    let [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()
    const page1ptid = decodeAttributes(sessionReplayHarvests[0].request.query.attributes).harvestId.split('_')[1]

    testExpectedReplay({ data: sessionReplayHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
    sessionReplayHarvests.slice(1).forEach(harvest =>
      testExpectedReplay({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    )

    ;[sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.refresh()
    ])

    const refreshHarvests = sessionReplayHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).harvestId.indexOf(page1ptid) === -1)
    expect(refreshHarvests.length).toBeGreaterThan(0)

    /**
     * Preloaded payloads may be sent after the first page load harvest. See https://new-relic.atlassian.net/browse/NR-305669
     * Once that ticket is fixed, the below checks should pass
     */
    // testExpectedReplay({ data: refreshHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
    // refreshHarvests.slice(1).forEach(harvest =>
    //   testExpectedReplay({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    // )
  })

  it('should record across same-tab page navigation', async () => {
    let [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()
    const page1ptid = decodeAttributes(sessionReplayHarvests[0].request.query.attributes).harvestId.split('_')[1]

    testExpectedReplay({ data: sessionReplayHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
    sessionReplayHarvests.slice(1).forEach(harvest =>
      testExpectedReplay({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    )

    ;[sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const refreshHarvests = sessionReplayHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).harvestId.indexOf(page1ptid) === -1)
    expect(refreshHarvests.length).toBeGreaterThan(0)

    /**
     * Preloaded payloads may be sent after the first page load harvest. See https://new-relic.atlassian.net/browse/NR-305669
     * Once that ticket is fixed, the below checks should pass
     */
    // testExpectedReplay({ data: refreshHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
    // refreshHarvests.slice(1).forEach(harvest =>
    //   testExpectedReplay({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    // )
  })

  it.withBrowsersMatching(supportsMultiTabSessions)('should record across new-tab page navigation', async () => {
    let [sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()
    const page1ptid = decodeAttributes(sessionReplayHarvests[0].request.query.attributes).harvestId.split('_')[1]

    testExpectedReplay({ data: sessionReplayHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })
    sessionReplayHarvests.slice(1).forEach(harvest =>
      testExpectedReplay({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    )

    ;[sessionReplayHarvests] = await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 15000 }),
      browser.createWindow('tab')
        .then((newTab) => browser.switchToWindow(newTab.handle))
        .then(async () => browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig())))
        .then(() => browser.waitForAgentLoad())
    ])

    const newTabHarvests = sessionReplayHarvests
      .filter(harvest => decodeAttributes(harvest.request.query.attributes).harvestId.indexOf(page1ptid) === -1)
    expect(newTabHarvests.length).toBeGreaterThan(0)

    /**
     * Preloaded payloads may be sent after the first page load harvest. See https://new-relic.atlassian.net/browse/NR-305669
     * Once that ticket is fixed, the below checks should pass
     */
    // testExpectedReplay({ data: newTabHarvests[0].request, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
    // newTabHarvests.slice(1).forEach(harvest =>
    //   testExpectedReplay({ data: harvest.request, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    // )

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
  })

  it.withBrowsersMatching(supportsMultiTabSessions)('should kill active tab if killed in backgrounded tab', async () => {
    await Promise.all([
      sessionReplaysCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    await Promise.all([
      sessionReplaysCapture.waitForResult({ timeout: 15000 }),
      browser.createWindow('tab')
        .then((newTab) => browser.switchToWindow(newTab.handle))
        .then(async () => browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig())))
        .then(() => browser.waitForAgentLoad())
    ])

    const page2Blocked = await browser.execute(function () {
      try {
        var agg = Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate
        agg.abort()
        return agg.blocked
      } catch (err) {
        return false
      }
    })
    expect(page2Blocked).toEqual(true)

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      events: [],
      initialized: true,
      recording: false,
      mode: 0,
      blocked: true
    }))

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])

    await browser.pause(1000) // Give the agent time to update the session replay state
    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      events: [],
      initialized: true,
      recording: false,
      mode: 0,
      blocked: true
    }))
  })
})
