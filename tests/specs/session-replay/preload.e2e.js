import { srConfig, testExpectedReplay } from '../util/helpers'
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('Session Replay Payload Validation', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should allow for preload if already recording', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    await browser.enableSessionReplay()
    await browser.refresh()
      .then(() => browser.waitForAgentLoad())

    const [{ request: harvestContents }, wasPreloaded] = await Promise.all([
      browser.testHandle.expectReplay(), // preload harvest
      browser.execute(function () {
        return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
      })
    ])

    testExpectedReplay({ data: harvestContents })
    expect(wasPreloaded).toEqual(true)
  })

  it('should allow for preload if configured', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: true } })))
      .then(() => browser.waitForAgentLoad())

    const [{ request: harvestContents }, wasPreloaded] = await Promise.all([
      browser.testHandle.expectBlob(), // preload harvest
      browser.execute(function () {
        return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
      })
    ])

    testExpectedReplay({ data: harvestContents })
    expect(wasPreloaded).toEqual(true)
  })

  it('should NOT preload if not configured or recording', async () => {
    const [{ request: harvestContents }, wasPreloaded] = await Promise.all([
      browser.testHandle.expectBlob(), // preload harvest
      browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: false } })))
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.execute(function () {
          return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
        }))
    ])

    testExpectedReplay({ data: harvestContents })
    expect(wasPreloaded).toEqual(false)
  })

  it('should NOT harvest beginning preload data if not sampled', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { preload: true, sampling_rate: 0, error_sampling_rate: 0 } })))
      .then(() => browser.waitForAgentLoad())

    const [wasPreloaded] = await Promise.all([
      browser.execute(function () {
        return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
      }),
      browser.testHandle.expectBlob(10000, true) // preload harvest should not send
    ])

    expect(wasPreloaded).toEqual(true)
  })
})
