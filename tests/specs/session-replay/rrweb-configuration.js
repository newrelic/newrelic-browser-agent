
function config (props = {}) {
  return {
    loader: 'experimental',
    init: {
      privacy: { cookies_enabled: true },
      session_replay: { enabled: true, harvestTimeSeconds: 5, sampleRate: 1, errorSampleRate: 0, ...props }
    }
  }
}

export default (function () {
  describe('Rrweb Configuration', () => {
    afterEach(async () => {
      await browser.destroyAgentSession(browser.testHandle)
    })

    describe('enabled', () => {
      it('enabled: true should import feature', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', config()))
          .then(() => browser.waitForAgentLoad())

        const wasInitialized = await browser.execute(function () {
          return Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.initialized
        })

        expect(wasInitialized).toEqual(true)
      })

      it('enabled: false should NOT import feature', async () => {
        await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ enabled: false })))
          .then(() => browser.waitForAgentLoad())

        const wasInitialized = await browser.execute(function () {
          try {
            return Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.initialized
          } catch (err) {
            return false
          }
        })

        expect(wasInitialized).toEqual(false)
      })
    })

    describe('maskAllInputs', () => {
      it('maskAllInputs: true should convert inputs to *', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea#plain').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })

      it('maskAllInputs: false should NOT convert inputs to *', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskAllInputs: false })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea#plain').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeTruthy()
      })
    })

    describe('maskTextSelector', () => {
      it('maskTextSelector: "*" should convert all text to *', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskAllInputs: false })))
          .then(() => browser.waitForAgentLoad())

        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('this is a generic page')).toBeFalsy()
      })

      it('maskTextSelector: "null" should convert NO text to "*"', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskAllInputs: false })))
          .then(() => browser.waitForAgentLoad())

        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('this is a generic page')).toBeTruthy()
      })
    })

    describe('ignoreClass', () => {
      it('ignoreClass: nr-ignore should ignore elem', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskAllInputs: false })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea.nr-ignore').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })

      it('ignoreClass: cannot be overridden', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskAllInputs: false, ignoreClass: null })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea.nr-ignore').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })
    })

    describe('blockClass', () => {
      it('blockClass: nr-block should block elem', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskAllInputs: false })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea.nr-block').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })

      it('blockClass: cannot be overridden', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskAllInputs: false, blockClass: null })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea.nr-block').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })
    })

    describe('maskTextClass', () => {
      it('maskTextClass: should mask elem', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea.nr-mask').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })

      it('maskTextClass: cannot be overridden', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskTextClass: null })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea.nr-mask').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })
    })

    describe('blockSelector', () => {
      it('blockSelector: nr-data-block should block elem', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskAllInputs: false })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea[data-nr-block]').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })

      it('blockSelector: only applies to specified elem', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskAllInputs: false })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea[data-nr-block]').value = 'testing'
          document.querySelector('textarea[data-other-block]').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeTruthy()
      })

      it('blockSelector: can be extended but not overridden', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskAllInputs: false, blockSelector: '[data-other-block]' })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('textarea[data-nr-block]').value = 'testing'
          document.querySelector('textarea[data-other-block]').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })
    })

    describe('maskInputOptions', () => {
      it('maskInputOptions: nr-data-block should block elem', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('#pass-input').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })

      it('maskInputOptions: can be extended but not overridden', async () => {
        await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ maskTextSelector: null, maskInputOptions: { text: true } })))
          .then(() => browser.waitForAgentLoad())

        await browser.execute(function () {
          document.querySelector('#pass-input').value = 'testing'
          document.querySelector('#text-input').value = 'testing'
        })
        const { request: { body } } = await browser.testHandle.expectBlob()

        expect(body.blob.includes('testing')).toBeFalsy()
      })
    })
  })
})()
