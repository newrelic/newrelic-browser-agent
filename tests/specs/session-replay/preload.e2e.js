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
})
