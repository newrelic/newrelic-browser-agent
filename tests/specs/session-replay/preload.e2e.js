import { notSafari, supportsMultipleTabs } from '../../../tools/browser-matcher/common-matchers.mjs'
import { srConfig, testExpectedReplay } from '../util/helpers'

describe('Session Replay Preload', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should preload the recorder when a session recording is already in progress', async () => {
    const [initialSessionReplayHarvest, wasPreloaded1] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: false } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(wasPreloaded1).toEqual(false)
    testExpectedReplay({ data: initialSessionReplayHarvest.request, hasSnapshot: true, hasMeta: true })

    const [,, wasPreloaded] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.testHandle.expectReplay(),
      browser.refresh()
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(wasPreloaded).toEqual(true)
  })

  it('should preload the recorder when preload is configured', async () => {
    const [initialSessionReplayHarvest, wasPreloaded1] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: true } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(wasPreloaded1).toEqual(true)
    testExpectedReplay({ data: initialSessionReplayHarvest.request, hasSnapshot: true, hasMeta: true })
  })

  it('should not preload if not configured and not recording', async () => {
    const [initialSessionReplayHarvest, wasPreloaded1] = await Promise.all([
      browser.testHandle.expectReplay(),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: false } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(wasPreloaded1).toEqual(false)
    testExpectedReplay({ data: initialSessionReplayHarvest.request, hasSnapshot: true, hasMeta: true })
  })

  it('should not harvest beginning preload data if not sampled', async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')
    await browser.enableSessionReplay(0, 0)
    const [, wasPreloaded] = await Promise.all([
      browser.testHandle.expectReplay(10000, true),
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: true } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded
        }))
    ])

    expect(wasPreloaded).toEqual(true)
  })

  it.withBrowsersMatching([supportsMultipleTabs, notSafari])('should start harvesting when start API called before the recorder import completes', async () => {
    const [, wasPreloaded] = await Promise.all([
      browser.testHandle.expectReplay(10000),
      browser.url(await browser.testHandle.assetURL('session_replay/64kb-dom-manual-start.html', srConfig({ session_replay: { preload: true, autoStart: false } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
        }))
    ])

    expect(wasPreloaded).toEqual(true)
  })
})
