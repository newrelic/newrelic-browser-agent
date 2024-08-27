import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'
import { srConfig, getSR } from '../util/helpers'

describe('Session Replay Ingest Behavior', () => {
  let sessionReplaysCapture

  beforeEach(async () => {
    sessionReplaysCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  it('should empty event buffer when sending', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    expect((await getSR()).events.length).toBeGreaterThan(0)

    await sessionReplaysCapture.waitForResult({ totalCount: 2 })

    expect((await getSR()).events.length).toEqual(0)
  })

  it('should stop recording if 429 response', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      events: expect.any(Array),
      initialized: true,
      recording: true,
      mode: 1,
      blocked: false
    }))

    await Promise.all([
      browser.testHandle.scheduleReply('bamServer', {
        test: testBlobReplayRequest,
        statusCode: 429
      }),
      sessionReplaysCapture.waitForResult({ timeout: 10000 })
    ])

    await expect(getSR()).resolves.toEqual(expect.objectContaining({
      events: [],
      initialized: true,
      recording: false,
      mode: 0,
      blocked: true
    }))
  })
})
