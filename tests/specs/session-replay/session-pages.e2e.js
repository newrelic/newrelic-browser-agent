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
    const [{ request: page1Contents }] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    await browser.enableSessionReplay()
    browser.testHandle.expectBlob(10000)
    const [{ request: page1EndContents }, { request: page2Contents }] = await Promise.all([
      browser.testHandle.expectBlob(),
      browser.testHandle.expectBlob(),
      browser.refresh()
        .then(() => Promise.all([
          browser.waitForAgentLoad()
        ]))
    ])

    testExpectedReplay({ data: page1EndContents, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
  })

  it('should record across same-tab page navigation', async () => {
    const [{ request: page1Contents }] = await Promise.all([
      browser.testHandle.expectBlob(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
    ])

    const { localStorage } = await browser.getAgentSessionInfo()
    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    await browser.enableSessionReplay()

    browser.testHandle.expectBlob(10000)
    const [{ request: page1EndContents }, { request: page2Contents }] = await Promise.all([
      browser.testHandle.expectBlob(10000),
      browser.testHandle.expectBlob(10000),
      browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
    ])

    testExpectedReplay({ data: page1EndContents, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })

    await wait(1000)
  })

  // // As of 06/26/2023 test fails in Safari, though tested behavior works in a live browser (revisit in NR-138940).
  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should record across new-tab page navigation', async () => {
    const [{ request: page1Contents }] = await Promise.all([
      browser.testHandle.expectBlob(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
    ])

    const { localStorage } = await browser.getAgentSessionInfo()
    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    /** This should fire when the tab changes, it's easier to stage it this way before hand, and allows for the super early staging for the next expect */
    browser.testHandle.expectBlob(15000).then(({ request: page1UnloadContents }) => {
      testExpectedReplay({ data: page1UnloadContents, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    })

    /** This is scoped out this way to guarantee we have it staged in time since preload can harvest super early, sometimes earlier than wdio can expect normally */
    /** see next `testExpectedReplay` */
    browser.testHandle.expectBlob(15000).then(async ({ request: page2Contents }) => {
      testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
      // await browser.closeWindow()
      // await browser.switchToWindow((await browser.getWindowHandles())[0])
    })

    await browser.enableSessionReplay()
    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
      .then(() => browser.waitForSessionReplayRecording())
  })

  it('should not record across navigations if not active', async () => {
    const [{ request: page1Contents }] = await Promise.all([
      browser.testHandle.expectBlob(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
    ])

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
    const [{ request: page1Contents }] = await Promise.all([
      browser.testHandle.expectBlob(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())
    ])

    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    /** This should fire when the tab changes, it's easier to stage it this way before hand, and allows for the super early staging for the next expect */
    browser.testHandle.expectBlob(15000).then(({ request: page1UnloadContents }) => {
      testExpectedReplay({ data: page1UnloadContents, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })
    })

    /** This is scoped out this way to guarantee we have it staged in time since preload can harvest super early, sometimes earlier than wdio can expect normally */
    /** see next `testExpectedReplay` */
    browser.testHandle.expectBlob(15000).then(async ({ request: page2Contents }) => {
      testExpectedReplay({ data: page2Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: false })
    })

    await browser.enableSessionReplay()
    const newTab = await browser.createWindow('tab')
    await browser.switchToWindow(newTab.handle)
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
      .then(() => browser.waitForSessionReplayRecording())

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
    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      events: [],
      initialized: true,
      recording: false,
      mode: 0,
      blocked: true
    }))
  })
})

function wait (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}
