import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { config, getSR } from './helpers'

describe.withBrowsersMatching(notIE)('Session Replay Initialization', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  it('should not start recording if rum response sr flag is 0', async function () {
    await browser.testHandle.clearScheduledReplies('bamServer')

    const [rumResp] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', config(undefined, this.test)))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    expect(JSON.parse(rumResp.reply.body).sr).toEqual(0)

    const sr = await getSR()
    expect(sr.initialized).toEqual(false)
    expect(sr.recording).toEqual(false)
  })

  it('should start recording if rum response sr flag is 1', async function () {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config(undefined, this.test)))
      .then(() => browser.waitForAgentLoad())

    await expect(browser.waitForSessionReplayRecording()).resolves.toBeUndefined()
  })

  it('should not load the aggregate if cookies_enabled is false', async function () {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ privacy: { cookies_enabled: false } }, this.test)))
      .then(() => browser.waitForAgentLoad())

    await expect(browser.waitForFeatureAggregate('session_replay', 5000)).rejects.toThrow()
  })

  it('should not run if session_trace is disabled', async function () {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ session_trace: { enabled: false } }, this.test)))
      .then(() => browser.waitForAgentLoad())

    await expect(browser.waitForFeatureAggregate('session_replay', 5000)).rejects.toThrow()
  })

  it('should not record if rum response sr flag is 0 and then api is called', async function () {
    await browser.testHandle.clearScheduledReplies('bamServer')
    await browser.url(await browser.testHandle.assetURL('instrumented.html', config(undefined, this.test)))
      .then(() => browser.waitForAgentLoad())

    await expect(browser.testHandle.expectBlob(10000, true)).resolves.toBeUndefined()
  })
})
