import { srConfig, getSR, testExpectedReplay, decodeAttributes } from '../util/helpers'
import { supportsMultipleTabs, notSafari } from '../../../tools/browser-matcher/common-matchers.mjs'

describe('Session Replay Across Pages', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should record across same-tab page refresh', async () => {
    const [{ request: page1Contents }] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])
    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    await browser.enableSessionReplay()
    const { request: other } = await browser.testHandle.expectReplay()
    const [
      { request: request1 },
      { request: request2 }
    ] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.testHandle.expectReplay(),
      browser.refresh()
        .then(() => Promise.all([
          browser.waitForAgentLoad()
        ]))
    ])

    expect(decodeAttributes(other.query.attributes).hasMeta || decodeAttributes(request1.query.attributes).hasMeta || decodeAttributes(request2.query.attributes).hasMeta).toBeTruthy()
    expect(decodeAttributes(other.query.attributes).hasSnapshot || decodeAttributes(request1.query.attributes).hasSnapshot || decodeAttributes(request2.query.attributes).hasSnapshot).toBeTruthy()

    testExpectedReplay({ data: request1, session: localStorage.value, hasError: false, isFirstChunk: false })
    testExpectedReplay({ data: request2, session: localStorage.value, hasError: false, isFirstChunk: false })
  })

  it('should record across same-tab page navigation', async () => {
    const [{ request: page1Contents }] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const { localStorage } = await browser.getAgentSessionInfo()
    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    await browser.enableSessionReplay()

    const { request: other } = await browser.testHandle.expectReplay()
    const [
      { request: request1 },
      { request: request2 }
    ] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.testHandle.expectReplay(10000),
      browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(decodeAttributes(other.query.attributes).hasMeta || decodeAttributes(request1.query.attributes).hasMeta || decodeAttributes(request2.query.attributes).hasMeta).toBeTruthy()
    expect(decodeAttributes(other.query.attributes).hasSnapshot || decodeAttributes(request1.query.attributes).hasSnapshot || decodeAttributes(request2.query.attributes).hasSnapshot).toBeTruthy()

    testExpectedReplay({ data: request1, session: localStorage.value, hasError: false, isFirstChunk: false })
    testExpectedReplay({ data: request2, session: localStorage.value, hasError: false, isFirstChunk: false })
  })

  // // As of 06/26/2023 test fails in Safari, though tested behavior works in a live browser (revisit in NR-138940).
  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should record across new-tab page navigation', async () => {
    const [{ request: page1Contents }] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const { localStorage } = await browser.getAgentSessionInfo()
    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    const [{ request: page1UnloadContents }] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.execute(function () {
        try {
          document.querySelector('body').click()
        } catch (err) {
          // do nothing
        }
      }),
      browser.enableSessionReplay().then(() => browser.createWindow('tab')).then((newTab) => browser.switchToWindow(newTab.handle))
    ])
    testExpectedReplay({ data: page1UnloadContents, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })

    const [{ request: request1 }, { request: request2 }] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.testHandle.expectReplay(10000),
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    expect(decodeAttributes(request1.query.attributes).hasMeta || decodeAttributes(request2.query.attributes).hasMeta).toBeTruthy()
    expect(decodeAttributes(request1.query.attributes).hasSnapshot || decodeAttributes(request2.query.attributes).hasSnapshot).toBeTruthy()
    testExpectedReplay({ data: request1, session: localStorage.value, hasError: false, isFirstChunk: false })
    testExpectedReplay({ data: request2, session: localStorage.value, hasError: false, isFirstChunk: false })

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])
  })

  // As of 06/26/2023 test fails in Safari, though tested behavior works in a live browser (revisit in NR-138940).
  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should kill active tab if killed in backgrounded tab', async () => {
    const [{ request: page1Contents }] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    const { localStorage } = await browser.getAgentSessionInfo()

    testExpectedReplay({ data: page1Contents, session: localStorage.value, hasError: false, hasMeta: true, hasSnapshot: true, isFirstChunk: true })

    const [{ request: page1UnloadContents }] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.execute(function () {
        try {
          document.querySelector('body').click()
        } catch (err) {
          // do nothing
        }
      }),
      browser.enableSessionReplay().then(() => browser.createWindow('tab')).then((newTab) => browser.switchToWindow(newTab.handle))
    ])
    testExpectedReplay({ data: page1UnloadContents, session: localStorage.value, hasError: false, hasMeta: false, hasSnapshot: false, isFirstChunk: false })

    const [{ request: request1 }, { request: request2 }] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.testHandle.expectReplay(10000),
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    expect(decodeAttributes(request1.query.attributes).hasMeta || decodeAttributes(request2.query.attributes).hasMeta).toBeTruthy()
    expect(decodeAttributes(request1.query.attributes).hasSnapshot || decodeAttributes(request2.query.attributes).hasSnapshot).toBeTruthy()
    testExpectedReplay({ data: request1, session: localStorage.value, hasError: false, isFirstChunk: false })
    testExpectedReplay({ data: request2, session: localStorage.value, hasError: false, isFirstChunk: false })

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

    await browser.closeWindow()
    await browser.switchToWindow((await browser.getWindowHandles())[0])

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      events: [],
      initialized: true,
      recording: false,
      mode: 0,
      blocked: true
    }))
  })
})
