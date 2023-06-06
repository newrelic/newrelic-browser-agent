import { config, getSR } from './helpers'
import { testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

export default (function () {
  describe('Session Replay Initialization', () => {
    afterEach(async () => {
      await browser.destroyAgentSession(browser.testHandle)
    })

    describe('Feature flags', () => {
      // this test needs to be able to override the SR flag to 0
      // work needed to enable this in WDIO
      it('should not run if flag is 0', async () => {
        await browser.testHandle.scheduleReply('bamServer', {
          test: testRumRequest,
          body: `${JSON.stringify({
                  stn: 1,
                  err: 1,
                  ins: 1,
                  cap: 1,
                  spa: 1,
                  loaded: 1,
                  sr: 0
                })
                }`
        })
        browser.testHandle.expectRum().then(r => console.log('rum resp', r))
        await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
          .then(() => browser.waitForAgentLoad())

        await browser.pause(2000)
        const { initialized, recording } = await getSR()
        expect(initialized).toEqual(true)
        expect(recording).toEqual(false)
      })

      it('should run if flag is 1', async () => {
        console.log('config', config())
        await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
          .then(() => browser.waitForAgentLoad())

        await browser.pause(2000)
        const { initialized, recording } = await getSR()
        expect(initialized).toEqual(true)
        expect(recording).toEqual(true)
      })

      it('should not run if cookies_enabled is false', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', { ...config(), init: { ...config().init, privacy: { cookies_enabled: false } } }))
          .then(() => browser.waitForAgentLoad())

        const { exists } = await getSR()
        expect(exists).toEqual(false)
        expect(exists).toEqual(false)
      })

      it('should not run if session_trace is disabled', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', { ...config(), init: { ...config().init, session_trace: { enabled: false } } }))
          .then(() => browser.waitForAgentLoad())

        const { exists } = await getSR()
        expect(exists).toEqual(false)
        expect(exists).toEqual(false)
      })
    })
  })
})()
