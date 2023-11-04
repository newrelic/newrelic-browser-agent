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

  describe('optIn', async () => {
    it('when enabled: should only import feature after opt in', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', config({ session_replay: { autoStart: false } })))
        .then(() => browser.waitForAgentLoad())

      let wasInitialized = await browser.execute(function () {
        return !!Object.values(newrelic.initializedAgents)[0].features.session_replay?.featAggregate?.initialized
      })

      expect(wasInitialized).toEqual(false)

      await browser.execute(function () {
        newrelic.start('session_replay')
      })
      await browser.pause(1000)
      wasInitialized = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.initialized
      })
      expect(wasInitialized).toEqual(true)
    })
  })

  describe('mask_all_inputs', () => {
    it('mask_all_inputs: true should convert inputs to *', async () => {
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

    it('mask_all_inputs: false should NOT convert inputs to *', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_all_inputs: false } })))
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

  describe('mask_text_selector', () => {
    it('mask_text_selector: "*" should convert all text to *', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_all_inputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const { request: { body } } = await browser.testHandle.expectBlob()

      expect(JSON.stringify(body).includes('this is a page')).toBeFalsy()
    })

    it('mask_text_selector: "null" should convert NO text to "*"', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const { request: { body } } = await browser.testHandle.expectBlob()

      expect(JSON.stringify(body).includes('this is a page')).toBeTruthy()
    })
  })

  describe('ignore_class', () => {
    it('ignore_class: nr-ignore should ignore elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea.nr-ignore').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('ignore_class: cannot be overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_all_inputs: false, ignore_class: null } })))
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

  describe('block_class', () => {
    it('block_class: nr-block should block elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea.nr-block').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('block_class: cannot be overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_all_inputs: false, block_class: null } })))
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

  describe('mask_text_class', () => {
    it('mask_text_class: should mask elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea.nr-mask').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('mask_text_class: cannot be overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_text_class: null } })))
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

  describe('block_selector', () => {
    it('block_selector: nr-data-block should block elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('textarea[data-nr-block]').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('block_selector: only applies to specified elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
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

    it('block_selector: can be extended but not overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_all_inputs: false, block_selector: '[data-other-block]' } })))
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

    it('block_selector: should not extend on empty string argument', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_all_inputs: false, block_selector: '' } })))
        .then(() => browser.waitForAgentLoad())

      const blockSelectorOutput = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].init.session_replay.block_selector
      })

      expect(blockSelectorOutput.endsWith(',')).toEqual(false)
      expect(blockSelectorOutput.split(',').length).toEqual(1)
      expect(blockSelectorOutput.includes('[data-nr-block]')).toEqual(true)
    })
  })

  describe('mask_input_options', () => {
    it('mask_input_options: nr-data-block should block elem', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null } })))
        .then(() => browser.waitForAgentLoad())

      const [{ request: { body } }] = await Promise.all([
        browser.testHandle.expectBlob(),
        browser.execute(function () {
          document.querySelector('#pass-input').value = 'testing'
        })
      ])

      expect(JSON.stringify(body).includes('testing')).toBeFalsy()
    })

    it('mask_input_options: can be extended but not overridden', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { mask_text_selector: null, mask_input_options: { text: true } } })))
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

  describe('inline assets', () => {
    it('inline_images false DOES NOT add data url', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      const { request: { body } } = await browser.testHandle.expectBlob()

      const snapshotNode = body.find(x => x.type === 2)
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const bodyNode = htmlNode.childNodes.find(x => x.tagName === 'body')
      const imgNode = bodyNode.childNodes.find(x => x.tagName === 'img' && x.attributes.src.includes('wikimedia.org'))
      expect(!!imgNode.attributes.rr_dataURL).toEqual(false)
    })

    it('inline_images true DOES add data url', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { inline_images: true } })))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      const { request: { body } } = await browser.testHandle.expectBlob()

      const snapshotNode = body.find(x => x.type === 2)
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const bodyNode = htmlNode.childNodes.find(x => x.tagName === 'body')
      const imgNode = bodyNode.childNodes.find(x => x.tagName === 'img' && x.attributes.src.includes('wikimedia.org'))
      expect(!!imgNode.attributes.rr_dataURL).toEqual(true)
    })

    it('inline_stylesheet false DOES NOT add inline text', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config({ session_replay: { inline_stylesheet: false } })))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      const { request: { body } } = await browser.testHandle.expectBlob()

      const snapshotNode = body.find(x => x.type === 2)
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const headNode = htmlNode.childNodes.find(x => x.tagName === 'head')
      const linkNode = headNode.childNodes.find(x => x.tagName === 'link' && x.attributes.type === 'text/css')
      expect(!!linkNode.attributes._cssText).toEqual(false)
    })

    it('inline_stylesheet true DOES NOT add inline text', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', config()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      const { request: { body } } = await browser.testHandle.expectBlob()

      const snapshotNode = body.find(x => x.type === 2)
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const headNode = htmlNode.childNodes.find(x => x.tagName === 'head')
      const linkNode = headNode.childNodes.find(x => x.tagName === 'link' && x.attributes.type === 'text/css')
      expect(!!linkNode.attributes._cssText).toEqual(true)
    })
  })
})
