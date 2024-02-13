import { config, testExpectedReplay } from './helpers'
import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'

describe.withBrowsersMatching(notIE)('Session Replay Payload Validation', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  it('should allow for preload if already recording', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    await browser.enableSessionReplay()
    await browser.refresh()
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

  it('should allow for preload if configured', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { preload: true } })))
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
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { preload: false } })))
      .then(() => browser.waitForAgentLoad())

    const [{ request: harvestContents }, wasPreloaded] = await Promise.all([
      browser.testHandle.expectBlob(), // preload harvest
      browser.execute(function () {
        return window.wasPreloaded // window var set at load time which checks the SR recorder's buffer to see if populated before load
      })
    ])

    testExpectedReplay({ data: harvestContents })
    expect(wasPreloaded).toEqual(false)
  })
})
