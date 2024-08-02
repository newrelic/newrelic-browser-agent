import { decodeAttributes, srConfig } from '../util/helpers'

describe('RRWeb Configuration', () => {
  beforeEach(async () => {
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  describe('enabled', () => {
    it('enabled: true should import feature', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig()))
        .then(() => browser.waitForFeatureAggregate('session_replay'))

      const wasInitialized = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.initialized
      })

      expect(wasInitialized).toEqual(true)
    })

    it('enabled: false should NOT import feature', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig({ session_replay: { enabled: false } })))
        .then(() => browser.waitForAgentLoad())

      await expect(browser.waitForFeatureAggregate('session_replay', 10000)).rejects.toThrow()
    })
  })

  describe('optIn', async () => {
    it('when enabled: should only import feature after opt in', async () => {
      await browser.url(await browser.testHandle.assetURL('instrumented.html', srConfig({ session_replay: { autoStart: false } })))
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
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea#plain').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })

    it('mask_all_inputs: false should NOT convert inputs to *', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_all_inputs: false } })))
          // .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea#plain').value = 'testing'
          }))
      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeTruthy()
    })
  })

  describe('mask_text_selector', () => {
    it('mask_text_selector: "*" should convert all text to *', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_all_inputs: false } })))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('this is a page')).toBeFalsy()
    })

    it('mask_text_selector: "null" should convert NO text to "*"', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
          .then(() => browser.waitForAgentLoad())
      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('this is a page')).toBeTruthy()
    })
  })

  describe('ignore_class', () => {
    it('ignore_class: nr-ignore should ignore elem', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea.nr-ignore').value = 'testing'
          }))
      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })

    it('ignore_class: cannot be overridden', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_all_inputs: false, ignore_class: null } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea.nr-ignore').value = 'testing'
          }))
      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })
  })

  describe('block_class', () => {
    it('block_class: nr-block should block elem', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea.nr-block').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })

    it('block_class: cannot be overridden', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_all_inputs: false, block_class: null } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea.nr-block').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })
  })

  describe('mask_text_class', () => {
    it('mask_text_class: should mask elem', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea.nr-mask').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })

    it('mask_text_class: cannot be overridden', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_text_class: null } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea.nr-mask').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })
  })

  describe('mask fn callbacks', () => {
    it('maskTextFn: should mask un-decorated DOM elems (control test)', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: '*', mask_all_inputs: true } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea#plain').value = 'testing'
            document.querySelector('input#text-input').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })
    it('maskTextFn: should unmask text elems by class', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: 'textarea' } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea#unmask-class').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeTruthy()
    })

    it('maskTextFn: should unmask text elems by data attr', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: 'textarea' } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea#unmask-data').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeTruthy()
    })

    it('maskTextFn: should unmask inputs by class', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_all_inputs: true } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('input#unmask-class').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeTruthy()
    })

    it('maskTextFn: should unmask inputs by data attr', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_all_inputs: true } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('input#unmask-data').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeTruthy()
    })

    it('maskTextFn: should NOT unmask password inputs even when included', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: 'input' } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('input#unmask-pass-input').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })

    it('maskTextFn: should unmask even with mask all selector ("*")', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: '*' } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea#unmask-class').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeTruthy()
    })
  })

  describe('block_selector', () => {
    it('block_selector: nr-data-block should block elem', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea[data-nr-block]').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })

    it('block_selector: only applies to specified elem', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_all_inputs: false } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea[data-nr-block]').value = 'testing'
            document.querySelector('textarea[data-other-block]').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeTruthy()
    })

    it('block_selector: can be extended but not overridden', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_all_inputs: false, block_selector: '[data-other-block]' } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('textarea[data-nr-block]').value = 'testing'
            document.querySelector('textarea[data-other-block]').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })

    it('block_selector: should not extend on empty string argument', async () => {
      await browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_all_inputs: false, block_selector: '' } })))
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
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('#pass-input').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })

    it('mask_input_options: can be extended but not overridden', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { mask_text_selector: null, mask_input_options: { text: true } } })))
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.execute(function () {
            document.querySelector('#pass-input').value = 'testing'
            document.querySelector('#text-input').value = 'testing'
          }))

      ])

      expect(`${JSON.stringify(body1)}${JSON.stringify(body2)}`.includes('testing')).toBeFalsy()
    })
  })

  describe('inline assets', () => {
    it('never collects inline images', async () => {
      const [{ request: { body: body1 } }, { request: { body: body2 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
          .then(() => browser.waitForFeatureAggregate('session_replay'))
      ])

      const snapshotNode = body1.find(x => x.type === 2) || body2.find(x => x.type === 2)
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const bodyNode = htmlNode.childNodes.find(x => x.tagName === 'body')
      const imgNode = bodyNode.childNodes.find(x => x.tagName === 'img' && x.attributes.src.includes('wikimedia.org'))
      expect(!!imgNode.attributes.rr_dataURL).toEqual(false)
    })

    it('inline_stylesheet false DOES NOT add inline text', async () => {
      const [{ request: { body: body1, query: query1 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig({ session_replay: { inline_stylesheet: false } })))
          .then(() => browser.waitForFeatureAggregate('session_replay'))
      ])

      expect(decodeAttributes(query1.attributes).inlinedAllStylesheets).toEqual(false)
      const snapshotNode = body1.find(x => x.type === 2)
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const headNode = htmlNode.childNodes.find(x => x.tagName === 'head')
      const linkNode = headNode.childNodes.find(x => x.tagName === 'link' && x.attributes.type === 'text/css')
      expect(!!linkNode.attributes._cssText).toEqual(false)
    })

    it('inline_stylesheet true DOES add inline text', async () => {
      const [{ request: { body: body1, query: query1 } }] = await Promise.all([
        browser.testHandle.expectReplay(10000),
        browser.url(await browser.testHandle.assetURL('rrweb-instrumented.html', srConfig()))
          .then(() => browser.waitForFeatureAggregate('session_replay'))
      ])

      expect(decodeAttributes(query1.attributes).inlinedAllStylesheets).toEqual(true)
      const snapshotNode = body1.find(x => x.type === 2)
      const htmlNode = snapshotNode.data.node.childNodes.find(x => x.tagName === 'html')
      const headNode = htmlNode.childNodes.find(x => x.tagName === 'head')
      const linkNode = headNode.childNodes.find(x => x.tagName === 'link' && x.attributes.type === 'text/css')
      expect(!!linkNode.attributes._cssText).toEqual(true)
    })
  })
})
