import { config, getSR } from './helpers'

export default (function () {
  describe('Session Replay Initialization', () => {
    afterEach(async () => {
      await browser.destroyAgentSession(browser.testHandle)
    })

    describe('Feature flags', () => {
      it('should not run if flag is 0', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
          .then(() => browser.waitForAgentLoad())

        await browser.pause(1000)
        const { initialized, recording } = await getSR()
        expect(initialized).toEqual(true)
        expect(recording).toEqual(false)
      })

      it('should run if flag is 1', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
          .then(() => browser.waitForAgentLoad())

        await browser.pause(1000)
        const { initialized, recording } = await getSR()
        expect(initialized).toEqual(true)
        expect(recording).toEqual(true)
      })
    })
  })
})()
