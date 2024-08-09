import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
import { srConfig, getSR } from '../util/helpers'

async function disqualifySR () {
  await browser.testHandle.clearScheduledReplies('bamServer')
  await browser.testHandle.scheduleReply('bamServer', {
    test: testRumRequest,
    permanent: true,
    body: JSON.stringify({
      st: 1,
      sts: 1,
      err: 1,
      ins: 1,
      spa: 1,
      loaded: 1,
      sr: 0,
      srs: 0
    })
  })
}

describe('Session Replay Initialization', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  it('should not start recording if rum response sr flag is 0', async () => {
    await disqualifySR()
    const [rumResp] = await Promise.all([
      browser.testHandle.expectRum(),
      browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    expect(JSON.parse(rumResp.reply.body).sr).toEqual(0)

    const sr = await getSR()
    expect(sr.initialized).toEqual(false)
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
    await disqualifySR()
    await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
      .then(() => browser.waitForAgentLoad())

    await expect(browser.testHandle.expectReplay(10000, true)).resolves.toBeUndefined()
  })
})
