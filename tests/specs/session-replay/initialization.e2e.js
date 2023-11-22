import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { srConfig, getSR } from './helpers'

describe.withBrowsersMatching(notIE)('Session Replay Initialization', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  it('should not start recording if rum response sr flag is 0', async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')

    const [rumResp] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    expect(JSON.parse(rumResp.reply.body).sr).toEqual(0)

    const sr = await getSR()
    expect(sr.initialized).toEqual(true)
    expect(sr.recording).toEqual(false)
  })

  it('should start recording if rum response sr flag is 1', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    await expect(browser.waitForSessionReplayRecording()).resolves.toBeUndefined()
  })

  it('should not load the aggregate if cookies_enabled is false', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig({ privacy: { cookies_enabled: false } })))
      .then(() => browser.waitForAgentLoad())

    await expect(browser.waitForFeatureAggregate('session_replay', 5000)).rejects.toThrow()
  })

  it('should not run if session_trace is disabled', async () => {
    await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig({ session_trace: { enabled: false } })))
      .then(() => browser.waitForAgentLoad())

    await expect(browser.waitForFeatureAggregate('session_replay', 5000)).rejects.toThrow()
  })

  it('should not record if rum response sr flag is 0 and then api is called', async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')
    await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    await expect(browser.testHandle.expectReplay(10000, true)).resolves.toBeUndefined()
  })
})
