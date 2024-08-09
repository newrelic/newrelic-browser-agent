import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'
import { srConfig, getSR } from '../util/helpers'

describe('Session Replay Ingest Behavior', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  it('Should empty event buffer when sending', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
      .then(() => browser.waitForSessionReplayRecording())

    expect((await getSR()).events.length).toBeGreaterThan(0)

    await browser.testHandle.expectReplay()

    expect((await getSR()).events.length).toEqual(0)
  })

  it('Should stop recording if 429 response', async () => {
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
      browser.testHandle.expectReplay()
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
