import { notIE } from '../../../tools/browser-matcher/common-matchers.mjs'
import { config } from './helpers'

describe.withBrowsersMatching(notIE)('RRWeb Configuration', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  describe('enabled', () => {
    it('enabled: true should import feature', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      const wasInitialized = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.initialized
      })

      expect(wasInitialized).toEqual(true)
    })

    it('enabled: false should NOT import feature', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ session_replay: { enabled: false } })))
        .then(() => browser.waitForAgentLoad())

      await expect(browser.waitForFeatureAggregate('session_replay', 10000)).rejects.toThrow()
    })
  })

  describe('maskAllInputs', () => {
    it('maskAllInputs: true should convert inputs to *', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea#plain').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('maskAllInputs: false should NOT convert inputs to *', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskAllInputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea#plain').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeTruthy()
    })
  })

  describe('maskTextSelector', () => {
    it('maskTextSelector: "*" should convert all text to *', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskAllInputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const { request: { body } } = await browser.testHandle.expectBlob()

      expect(JSON.stringify(body).includes('this is a page')).toBeFalsy()
    })

    it('maskTextSelector: "null" should convert NO text to "*"', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskAllInputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const { request: { body } } = await browser.testHandle.expectBlob()

      expect(JSON.stringify(body).includes('this is a page')).toBeTruthy()
    })
  })

  describe('ignoreClass', () => {
    it('ignoreClass: nr-ignore should ignore elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskAllInputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea.nr-ignore').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('ignoreClass: cannot be overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskAllInputs: false, ignoreClass: null } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea.nr-ignore').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })
  })

  describe('blockClass', () => {
    it('blockClass: nr-block should block elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskAllInputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea.nr-block').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('blockClass: cannot be overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskAllInputs: false, blockClass: null } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea.nr-block').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })
  })

  describe('maskTextClass', () => {
    it('maskTextClass: should mask elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea.nr-mask').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('maskTextClass: cannot be overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskTextClass: null } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea.nr-mask').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })
  })

  describe('blockSelector', () => {
    it('blockSelector: nr-data-block should block elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskAllInputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea[data-nr-block]').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('blockSelector: only applies to specified elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskAllInputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea[data-nr-block]').value = 'testing'
          document.querySelector('textarea[data-other-block]').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeTruthy()
    })

    it('blockSelector: can be extended but not overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskAllInputs: false, blockSelector: '[data-other-block]' } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea[data-nr-block]').value = 'testing'
          document.querySelector('textarea[data-other-block]').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })
  })

  describe('maskInputOptions', () => {
    it('maskInputOptions: nr-data-block should block elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('#pass-input').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('maskInputOptions: can be extended but not overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { maskTextSelector: null, maskInputOptions: { text: true } } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('#pass-input').value = 'testing'
          document.querySelector('#text-input').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })
  })
})
