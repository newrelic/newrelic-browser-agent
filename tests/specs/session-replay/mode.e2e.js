import { config, getSR } from './helpers'

export default (function () {
  describe('Session Replay Sample Mode Validation', () => {
    afterEach(async () => {
      await browser.destroyAgentSession(browser.testHandle)
    })

    it('Full 1 Error 1 === FULL', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ sampleRate: 1, errorSampleRate: 1 })))
        .then(() => browser.waitForAgentLoad())

      const sr = await getSR()

      expect(sr).toEqual(expect.objectContaining({
        recording: true,
        initialized: true,
        events: expect.any(Array),
        mode: 1
      }))
    })

    it('Full 1 Error 0 === FULL', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ sampleRate: 1, errorSampleRate: 0 })))
        .then(() => browser.waitForAgentLoad())

      const sr = await getSR()

      expect(sr).toEqual(expect.objectContaining({
        recording: true,
        initialized: true,
        events: expect.any(Array),
        mode: 1
      }))
    })

    it('Full 0 Error 1 === ERROR', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ sampleRate: 0, errorSampleRate: 1 })))
        .then(() => browser.waitForAgentLoad())

      const sr = await getSR()

      expect(sr).toEqual(expect.objectContaining({
        recording: true,
        initialized: true,
        events: expect.any(Array),
        mode: 2
      }))
    })

    it('Full 0 Error 0 === OFF', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ sampleRate: 0, errorSampleRate: 0 })))
        .then(() => browser.waitForAgentLoad())

      const sr = await getSR()

      expect(sr).toEqual(expect.objectContaining({
        recording: false,
        initialized: true,
        events: [],
        mode: 0
      }))
    })

    it('ERROR (seen after init) => FULL', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ sampleRate: 0, errorSampleRate: 1 })))
        .then(() => browser.waitForAgentLoad())

      expect(await getSR()).toEqual(expect.objectContaining({
        recording: true,
        initialized: true,
        events: expect.any(Array),
        mode: 2
      }))

      await browser.execute(function () {
        newrelic.noticeError(new Error('test'))
      })

      expect(await getSR()).toEqual(expect.objectContaining({
        recording: true,
        initialized: true,
        events: expect.any(Array),
        mode: 1
      }))
    })

    it('ERROR (seen before init) => FULL', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ sampleRate: 0, errorSampleRate: 1 })))
        .then(() => Promise.all([browser.execute(function () {
          newrelic.noticeError(new Error('test'))
        }), browser.waitForAgentLoad()]))

      expect(await getSR()).toEqual(expect.objectContaining({
        recording: true,
        initialized: true,
        events: expect.any(Array),
        mode: 1
      }))
    })

    it('FULL => OFF', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ sampleRate: 1, errorSampleRate: 0 })))
        .then(() => browser.waitForAgentLoad())

      expect(await getSR()).toEqual(expect.objectContaining({
        recording: true,
        initialized: true,
        events: expect.any(Array),
        mode: 1
      }))

      await browser.execute(function () {
        Object.values(NREUM.initializedAgents)[0].runtime.session.reset()
      })

      expect(await getSR()).toEqual(expect.objectContaining({
        recording: false,
        initialized: true,
        events: expect.any(Array),
        mode: 0
      }))
    })
  })
})()
