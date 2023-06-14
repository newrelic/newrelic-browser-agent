import { config, getSR } from './helpers'
import { testRumRequest, testBlobRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Session Replay Ingest Behavior', () => {
  beforeEach(async () => {
    await browser.testHandle.scheduleReply('bamServer', {
      test: testRumRequest,
      body: JSON.stringify({
        stn: 1,
        err: 1,
        ins: 1,
        cap: 1,
        spa: 1,
        loaded: 1,
        sr: 1
      })
    })
  })

  afterEach(async () => {
    await browser.testHandle.clearScheduledReplies('bamServer')
    await browser.destroyAgentSession(browser.testHandle)
  })

  it('Should empty event buffer when sending', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    expect((await getSR()).events.length).toBeGreaterThan(0)

    await browser.testHandle.expectBlob()

    expect((await getSR()).events.length).toEqual(0)
  })

  it('Should stop recording if 429 response', async () => {
    await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
      .then(() => browser.waitForAgentLoad())

    expect(await getSR()).toEqual(expect.objectContaining({
      events: expect.any(Array),
      initialized: true,
      recording: true,
      mode: 1,
      blocked: false
    }))

    await Promise.all([
      browser.testHandle.expectBlob(),
      browser.testHandle.scheduleReply('bamServer', {
        test: testBlobRequest,
        statusCode: 429
      })
    ])

    expect(await getSR()).toEqual(expect.objectContaining({
      events: [],
      initialized: true,
      recording: false,
      mode: 0,
      blocked: true
    }))
  })
})
