import { JSONPath } from 'jsonpath-plus'
import { faker } from '@faker-js/faker'
import { decodeAttributes, srConfig } from '../util/helpers'
import { testBlobReplayRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('RRWeb Configuration', () => {
  let sessionReplaysCapture

  beforeEach(async () => {
    sessionReplaysCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testBlobReplayRequest })
    await browser.enableSessionReplay()
  })

  afterEach(async () => {
    await browser.destroyAgentSession(browser.testHandle)
  })

  describe('enabled', () => {
    it('enabled: true should import feature', async () => {
      await visit('instrumented.html')
        .then(() => browser.waitForFeatureAggregate('session_replay'))
        .then(() => browser.pause(1000))

      const wasInitialized = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.initialized
      })

      expect(wasInitialized).toEqual(true)
    })

    it('enabled: false should NOT import feature', async () => {
      await visit('instrumented.html', { session_replay: { enabled: false } })
        .then(() => browser.pause(1000))

      await expect(browser.waitForFeatureAggregate('session_replay', 10000)).rejects.toThrow()
    })
  })

  describe('optIn', async () => {
    it('when enabled: should only import feature after opt in', async () => {
      await visit('instrumented.html', { session_replay: { autoStart: false } })
        .then(() => browser.pause(1000))

      let wasInitialized = await browser.execute(function () {
        return !!Object.values(newrelic.initializedAgents)[0].features.session_replay?.featAggregate?.initialized
      })

      expect(wasInitialized).toEqual(false)

      await browser.execute(function () {
        newrelic.start('session_replay')
      })

      await browser.pause(1000) // Give the agent time to update the session replay state

      wasInitialized = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].features.session_replay.featAggregate.initialized
      })

      expect(wasInitialized).toEqual(true)
    })
  })

  describe('mask_all_inputs', () => {
    it('mask_all_inputs: true should convert inputs to *', async () => {
      await visit('rrweb-instrumented.html')

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', id: 'plain', shouldMask: true }
      ])
    })

    it('mask_all_inputs: false should NOT convert inputs to *', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_all_inputs: false } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', id: 'plain', shouldMask: false }
      ])
    })
  })

  describe('mask_text_selector', () => {
    it('mask_text_selector: "*" should convert text to * and leave whitespace-only text as-is', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_all_inputs: false } })
      const sessionReplaysHarvests = await getInitialHarvest()

      const snapshotHarvest = sessionReplaysHarvests.find(x => decodeAttributes(x.request.query.attributes).hasSnapshot === true)
      expect(snapshotHarvest).toBeDefined()

      // note: we need to leave text nodes containing only whitespace as-is to avoid adding extraneous '*'
      const whitespaceOnlyNodes = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.type===3 && !!@.textContent && @.textContent.match(/^\\s+$/) && ![\'script\',\'link\',\'style\'].includes(@parent.tagName))]', json: sessionReplaysHarvests })
      expect(whitespaceOnlyNodes.length).toBeGreaterThan(0)

      whitespaceOnlyNodes.forEach(node => {
        expect(node.textContent).toMatch(/\s+/)
      })

      const testNodes = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.type===3 && !!@.textContent && @.textContent.match(/\\S+/) && ![\'script\',\'link\',\'style\'].includes(@parent.tagName))]', json: sessionReplaysHarvests })
      expect(testNodes.length).toBeGreaterThan(0)

      testNodes.forEach(node => {
        expect(node.textContent).toMatch(/\*+/)
      })
    })

    it('mask_text_selector: "null" should convert NO text to "*"', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_all_inputs: false } })
      const sessionReplaysHarvests = await getInitialHarvest()

      const snapshotHarvest = sessionReplaysHarvests.find(x => decodeAttributes(x.request.query.attributes).hasSnapshot === true)
      expect(snapshotHarvest).toBeDefined()

      const testNodes = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.type===3 && !!@.textContent && ![\'script\',\'link\',\'style\'].includes(@parent.tagName))]', json: sessionReplaysHarvests })
      expect(testNodes.length).toBeGreaterThan(0)

      testNodes.forEach(node => {
        expect(node.textContent).not.toMatch(/\*+/)
      })
    })
  })

  describe('ignore_class', () => {
    it('ignore_class: nr-ignore should ignore elem', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_all_inputs: false } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', clazz: 'nr-ignore', shouldIgnore: true }
      ])
    })

    it('ignore_class: cannot be overridden', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_all_inputs: false, ignore_class: null } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', clazz: 'nr-ignore', shouldIgnore: true }
      ])
    })
  })

  describe('block_class', () => {
    it('block_class: nr-block should block elem', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_all_inputs: false } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', clazz: 'nr-block', shouldBlock: true }
      ])
    })

    it('block_class: cannot be overridden', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_all_inputs: false, block_class: null } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', clazz: 'nr-block', shouldBlock: true }
      ])
    })
  })

  describe('mask_text_class', () => {
    it('mask_text_class: should mask elem', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', clazz: 'nr-mask', shouldMask: true }
      ])
    })

    it('mask_text_class: cannot be overridden', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_text_class: null } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', clazz: 'nr-mask', shouldMask: true }
      ])
    })
  })

  describe('mask fn callbacks', () => {
    it('maskTextFn: should mask un-decorated DOM elems (control test)', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: '*', mask_all_inputs: true } })
      await getInitialHarvest()

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', id: 'plain', shouldMask: true },
        { tagName: 'input', id: 'text-input', shouldMask: true }
      ])
    })

    it('maskTextFn: should unmask text elems by class', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: 'textarea' } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', id: 'unmask-class', shouldMask: false }
      ])
    })

    it('maskTextFn: should unmask text elems by data attr', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: 'textarea' } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', id: 'unmask-data', shouldMask: false }
      ])
    })

    it('maskTextFn: should unmask inputs by class', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_all_inputs: true } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', id: 'unmask-class', shouldMask: false }
      ])
    })

    it('maskTextFn: should unmask inputs by data attr', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_all_inputs: true } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'input', id: 'unmask-data', shouldMask: false }
      ])
    })

    it('maskTextFn: should NOT unmask password inputs even when included', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: 'input' } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'input', id: 'unmask-pass-input', shouldMask: true }
      ])
    })

    it('maskTextFn: should unmask even with mask all selector ("*")', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: '*' } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', id: 'unmask-class', shouldMask: false }
      ])
    })
  })

  describe('block_selector', () => {
    it('block_selector: data-nr-block should block elem', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_all_inputs: false } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', dataAttribute: 'nr-block', shouldBlock: true }
      ])
    })

    it('block_selector: only applies to specified elem', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_all_inputs: false } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', dataAttribute: 'nr-block', shouldBlock: true },
        { tagName: 'textarea', dataAttribute: 'other-block', shouldBlock: false }
      ])
    })

    it('block_selector: can be extended but not overridden', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_all_inputs: false, block_selector: '[data-other-block]' } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'textarea', dataAttribute: 'nr-block', shouldBlock: true },
        { tagName: 'textarea', dataAttribute: 'other-block', shouldBlock: true }
      ])
    })

    it('block_selector: should not extend on empty string argument', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_all_inputs: false, block_selector: '' } })

      const blockSelectorOutput = await browser.execute(function () {
        return Object.values(newrelic.initializedAgents)[0].init.session_replay.block_selector
      })

      expect(blockSelectorOutput.endsWith(',')).toEqual(false)
      expect(blockSelectorOutput.split(',').length).toEqual(1)
      expect(blockSelectorOutput.includes('[data-nr-block]')).toEqual(true)
    })
  })

  describe('mask_input_options', () => {
    it('mask_input_options: can be extended but not overridden', async () => {
      await visit('rrweb-instrumented.html', { session_replay: { mask_text_selector: null, mask_input_options: { text: true } } })

      await checkSessionReplayInputMasking(sessionReplaysCapture, [
        { tagName: 'input', id: 'pass-input', shouldMask: true },
        { tagName: 'input', id: 'text-input', shouldMask: true }
      ])
    })
  })

  describe('inline assets', () => {
    it('never collects inline images', async () => {
      await visit('rrweb-instrumented.html')
      const sessionReplaysHarvests = await getInitialHarvest()

      const imageNodes = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.tagName===\'img\' && @.attributes.src.match(/wikimedia/i))]', json: sessionReplaysHarvests })
      expect(imageNodes.length).toEqual(1)
      expect(imageNodes[0].attributes.rr_dataURL).toBeUndefined()
    })

    it('agent always inlines stylesheets', async () => {
      await visit('rrweb-instrumented.html')
      const sessionReplaysHarvests = await getInitialHarvest()

      expect(decodeAttributes(sessionReplaysHarvests[0].request.query.attributes).inlinedAllStylesheets).toEqual(true)

      const linkNodes = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.tagName===\'link\' && @.attributes.type===\'text/css\')]', json: sessionReplaysHarvests })
      linkNodes.forEach(linkNode => {
        expect(linkNode.attributes._cssText).toEqual(expect.any(String))
        expect(linkNode.attributes._cssText.length).toBeGreaterThan(0)
      })
    })
  })

  describe('slimDOMOptions', () => {
    it('should NOT collect script nodes by default', async () => {
      await visit('rrweb-instrumented.html')

      const sessionReplaysHarvests = await getInitialHarvest()
      const snapshotHarvest = sessionReplaysHarvests.find(x => decodeAttributes(x.request.query.attributes).hasSnapshot === true)
      expect(snapshotHarvest).toBeDefined()

      const scriptNodes = JSONPath({ path: '$.request.body.[?(@.type===2 && @.tagName==="html")].childNodes.[?(@.tagName==="head")].childNodes.[?(@.tagName==="script")]', json: snapshotHarvest })
      expect(scriptNodes.length).toBe(0)
    })
  })

  async function visit (url, config) {
    return browser.url(await browser.testHandle.assetURL(url, srConfig(config)))
      .then(() => browser.waitForAgentLoad())
  }

  function getInitialHarvest () {
    return sessionReplaysCapture.waitForResult({ totalCount: 1, timeout: 10000 })
  }

  /**
 * Performs updates on the provided input element and checks the session replay harvests for masking
 * @param sessionReplaysCapture {NetworkCapture}
 * @param elements {Array<{tagName: string, [id]: string, [clazz]: string, [dataAttribute]: string, [shouldMask]: boolean, [shouldBlock]: boolean, shouldIgnore: boolean}>}
 * @returns {Promise<void>}
 */
  async function checkSessionReplayInputMasking (sessionReplaysCapture, elements) {
    elements.forEach(el => {
      el.querySelector = el.tagName
      el.jsonPathFilter = `!!@ && @.tagName==='${el.tagName}'`

      if (el.id) {
        el.querySelector += `#${el.id}`
        el.jsonPathFilter += ` && @.attributes.id==='${el.id}'`
      } else if (el.clazz) {
        el.querySelector += `.${el.clazz}`
        el.jsonPathFilter += ` && @.attributes.class==='${el.clazz}'`
      } else if (el.dataAttribute) {
        el.querySelector += `[data-${el.dataAttribute}]`

        if (!el.shouldBlock) {
        // Blocked elements via data attribute have their data attribute removed
          el.jsonPathFilter += ` && @.attributes['data-${el.dataAttribute}']===""`
        }
      }
      if (el.shouldBlock) {
        el.jsonPathFilter += ' && @.attributes.rr_width && @.attributes.rr_height'
      }
    })

    // Wait for the snapshot harvest before updating inputs
    await getInitialHarvest()

    // Simulate typing
    await Promise.all(
      elements.map(el => $(el.querySelector).setValue(faker.string.uuid()))
    )

    // Simulate JS updating input value
    await browser.executeAsync((elements, value, done) => {
      Promise.all([
        elements.forEach(el => {
          document.querySelector(el.querySelector).value = value
        })
      ]).then(done)
    }, elements, faker.string.uuid())

    // initial snapshot + 1 additional harvest
    const sessionReplaysHarvests = await sessionReplaysCapture.waitForResult({ totalCount: 2, timeout: 10000 })
    expect(sessionReplaysHarvests.length).toBeGreaterThanOrEqual(1)

    const snapshotHarvest = sessionReplaysHarvests.find(x => decodeAttributes(x.request.query.attributes).hasSnapshot === true)
    expect(snapshotHarvest).toBeDefined()

    elements.forEach(el => {
      const snapshotNodes = JSONPath({ path: `$.request.body.[?(${el.jsonPathFilter})]`, json: snapshotHarvest })
      expect(snapshotNodes.length).toBeGreaterThanOrEqual(1)

      snapshotNodes.forEach(node => {
        if (el.shouldBlock) {
          expect(node.attributes.value).toBeUndefined()
        } else if (node.attributes.value) {
          if (el.shouldMask) {
            expect(node.attributes.value).toMatch(/\*+/)
          } else {
            expect(node.attributes.value).not.toMatch(/\*+/)
          }
        }

        const testNodes = JSONPath({ path: `$.[*].request.body.[?(!!@ && @.id===${node.id} && !!@.text)]`, json: sessionReplaysHarvests.slice(1) })

        if (el.shouldBlock || el.shouldIgnore) {
        // Updates to blocked and ignored elements should not create nodes in subsequent harvests
          expect(testNodes.length).toEqual(0)
          return
        } else {
          expect(testNodes.length).toBeGreaterThan(0)
        }

        testNodes.forEach(node => {
          if (el.shouldMask) {
            expect(node.text).toMatch(/\*+/)
          } else {
            expect(node.text).not.toMatch(/\*+/)
          }
        })
      })
    })
  }
})
