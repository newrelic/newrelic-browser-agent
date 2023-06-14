import { config, getSR } from './helpers'
import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('Session Replay Initialization', () => {
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

  describe('Feature flags', () => {
    it('should not run if flag is 0', async () => {
      await browser.testHandle.clearScheduledReplies('bamServer')
      await browser.testHandle.scheduleReply('bamServer', {
        test: testRumRequest,
        body: JSON.stringify({
          stn: 1,
          err: 1,
          ins: 1,
          cap: 1,
          spa: 1,
          loaded: 1,
          sr: 0
        })
      })

      const [rumResp] = await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => Promise.all([browser.testHandle.expectRum(), browser.waitForAgentLoad()]))

      expect(JSON.parse(rumResp.reply.body)).toEqual(expect.objectContaining({
        sr: 0
      }))
      const sr = await getSR()
      expect(sr.initialized).toEqual(true)
      expect(sr.recording).toEqual(false)
    })

    it('should run if flag is 1', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())

      const { initialized, recording } = await getSR()
      expect(initialized).toEqual(true)
      expect(recording).toEqual(true)
    })

    it('should not run if cookies_enabled is false', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { ...config(), init: { ...config().init, privacy: { cookies_enabled: false } } }))
        .then(() => browser.waitForAgentLoad())

      const { exists } = await getSR()
      expect(exists).toEqual(false)
    })

    it('should not run if session_trace is disabled', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', { ...config(), init: { ...config().init, session_trace: { enabled: false } } }))
        .then(() => browser.waitForAgentLoad())

      const { exists } = await getSR()
      expect(exists).toEqual(false)
    })
  })
})
