import { testBlobReplayRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'
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
    const rumCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testRumRequest })
    const [rumHarvests] = await Promise.all([
      rumCapture.waitForResult({ totalCount: 1 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))
    ])

    expect(JSON.parse(rumHarvests[0].reply.body).sr).toEqual(0)
    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      initialized: false,
      recording: false
    }))
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
    const sessionReplayCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    const [sessionReplayHarvests] = await Promise.all([
      sessionReplayCapture.waitForResult({ timeout: 10000 }),
      browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForAgentLoad())
    ])

    expect(sessionReplayHarvests.length).toEqual(0)
  })
})
