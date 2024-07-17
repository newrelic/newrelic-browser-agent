import { supportsFirstPaint, supportsFirstContentfulPaint } from '../../../tools/browser-matcher/common-matchers.mjs'
const { testInteractionEventsRequest, testErrorsRequest } = require('../../../tools/testing-server/utils/expect-tests')
const now = require('../../lib/now')

describe('attribution tests', () => {
  describe('action-text', () => {
    const init = {
      ajax: {
        deny_list: ['bam-test-1.nr-local.net']
      }
    }
    it('captures innerText', async () => {
      const [{ request: { body: IPL } }] = await Promise.all([
        browser.testHandle.expectInteractionEvents(10000),
        await browser.url(
          await browser.testHandle.assetURL('spa/action-text.html', { init })
        ).then(() => browser.waitForAgentLoad())
      ])
      let interactionTree = IPL[0]
      expect(interactionTree.trigger).toEqual('initialPageLoad')
      expect(interactionTree.children.length).toEqual(0)
      expect(interactionTree.isRouteChange).not.toBeTruthy()

      const clickIxnPromise = browser.testHandle.expectInteractionEvents(10000)
      await $('#one').click()
      const { request: { body: clickIxn } } = await clickIxnPromise

      interactionTree = clickIxn[0]
      expect(interactionTree.children.length).toEqual(1)
      expect(interactionTree.children[0]).toMatchObject({
        type: 'stringAttribute',
        key: 'actionText',
        value: '#1'
      })
    })

    it('captures value', async () => {
      const [{ request: { body: IPL } }] = await Promise.all([
        browser.testHandle.expectInteractionEvents(10000),
        await browser.url(
          await browser.testHandle.assetURL('spa/action-text.html', { init })
        ).then(() => browser.waitForAgentLoad())
      ])
      let interactionTree = IPL[0]
      expect(interactionTree.trigger).toEqual('initialPageLoad')
      expect(interactionTree.children.length).toEqual(0)
      expect(interactionTree.isRouteChange).not.toBeTruthy()

      const clickIxnPromise = browser.testHandle.expectInteractionEvents(10000)
      await $('#two').click()
      const { request: { body: clickIxn } } = await clickIxnPromise

      interactionTree = clickIxn[0]
      expect(interactionTree.children.length).toEqual(1)
      expect(interactionTree.children[0]).toMatchObject({
        type: 'stringAttribute',
        key: 'actionText',
        value: '#2'
      })
    })

    it('captures title', async () => {
      const [{ request: { body: IPL } }] = await Promise.all([
        browser.testHandle.expectInteractionEvents(10000),
        await browser.url(
          await browser.testHandle.assetURL('spa/action-text.html', { init })
        ).then(() => browser.waitForAgentLoad())
      ])
      let interactionTree = IPL[0]
      expect(interactionTree.trigger).toEqual('initialPageLoad')
      expect(interactionTree.children.length).toEqual(0)
      expect(interactionTree.isRouteChange).not.toBeTruthy()

      const clickIxnPromise = browser.testHandle.expectInteractionEvents(10000)
      await $('#three').click()
      const { request: { body: clickIxn } } = await clickIxnPromise

      interactionTree = clickIxn[0]
      expect(interactionTree.children.length).toEqual(1)
      expect(interactionTree.children[0]).toMatchObject({
        type: 'stringAttribute',
        key: 'actionText',
        value: '#3'
      })
    })

    it('does not capture body text', async () => {
      const [{ request: { body: IPL } }] = await Promise.all([
        browser.testHandle.expectInteractionEvents(10000),
        await browser.url(
          await browser.testHandle.assetURL('spa/action-text.html', { init })
        ).then(() => browser.waitForAgentLoad())
      ])
      let interactionTree = IPL[0]
      expect(interactionTree.trigger).toEqual('initialPageLoad')
      expect(interactionTree.children.length).toEqual(0)
      expect(interactionTree.isRouteChange).not.toBeTruthy()

      const clickIxnPromise = browser.testHandle.expectInteractionEvents(10000)
      await $('body').click()
      const { request: { body: clickIxn } } = await clickIxnPromise

      interactionTree = clickIxn[0]
      expect(interactionTree.children.length).toEqual(0)
    })
  })

  describe('basic tests', () => {
    it('should capture SPA interactions', async () => {
      let testStartTime = now()
      const [{ request: { body: IPL } }] = await Promise.all([
        browser.testHandle.expectInteractionEvents(10000),
        await browser.url(
          await browser.testHandle.assetURL('spa/xhr.html', { init: { session_trace: { enabled: false } } })
        ).then(() => browser.waitForAgentLoad())
      ])

      let interactionTree = IPL[0]
      expect(interactionTree.trigger).toEqual('initialPageLoad')
      expect(interactionTree.children[0].path.startsWith('/1/')).toEqual(true)
      expect(interactionTree.isRouteChange).not.toBeTruthy()

      const clickIxnPromise = browser.testHandle.expectInteractionEvents(10000)
      await $('body').click()
      const { request: { body: clickIxn, query } } = await clickIxnPromise
      let receiptTime = now()
      interactionTree = clickIxn[0]
      expect(interactionTree.id).toBeTruthy()
      expect(interactionTree.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)).toBeTruthy()
      expect(interactionTree.nodeId).toBeTruthy()

      expect(interactionTree.end).toBeGreaterThanOrEqual(interactionTree.start)
      expect(interactionTree.callbackEnd).toBeGreaterThanOrEqual(interactionTree.start)
      expect(interactionTree.end).toBeLessThanOrEqual(interactionTree.end)
      expect(interactionTree.children.length).toEqual(1)

      const xhr = interactionTree.children[0]

      expect(xhr.nodeId).toBeTruthy()
      expect(xhr.type).toEqual('ajax') //, 'should be an ajax node')
      expect(xhr.children.length).toEqual(0) //, 'should not have nested children')
      expect(xhr.method).toEqual('POST') // 'should be a POST request')
      expect(xhr.status).toEqual(200) // 'should have a 200 status')
      expect(xhr.domain.split(':')[0]).toEqual('bam-test-1.nr-local.net') // 'should have a correct hostname')
      var port = +xhr.domain.split(':')[1]
      expect(port > 1000 && port < 100000).toBeTruthy() //, 'port should be in expected range')
      expect(xhr.requestBodySize).toEqual(3) // 'should have correct requestBodySize')
      expect(xhr.responseBodySize).toEqual(3) // 'should have correct responseBodySize')
      expect(xhr.requestedWith).toEqual('XMLHttpRequest') // 'should indicate it was requested with xhr')

      let fixup = receiptTime - query.rst
      let estimatedInteractionTimestamp = interactionTree.start + fixup
      expect(estimatedInteractionTimestamp).toBeGreaterThan(testStartTime) //, 'estimated ixn start after test start')
      expect(estimatedInteractionTimestamp).toBeLessThan(receiptTime) //, 'estimated ixn start before receipt time')
    })

    it('should capture SPA interactions using loader_config data', async () => {
      let testStartTime = now()
      const [{ request: { body: IPL } }] = await Promise.all([
        browser.testHandle.expectInteractionEvents(10000),
        await browser.url(
          await browser.testHandle.assetURL('spa/xhr.html', { injectUpdatedLoaderConfig: true, init: { session_trace: { enabled: false } } })
        ).then(() => browser.waitForAgentLoad())
      ])

      let interactionTree = IPL[0]
      expect(interactionTree.trigger).toEqual('initialPageLoad')
      expect(interactionTree.children[0].path.startsWith('/1/')).toEqual(true)
      expect(interactionTree.isRouteChange).not.toBeTruthy()

      const clickIxnPromise = browser.testHandle.expectInteractionEvents(10000)
      await $('body').click()
      const { request: { body: clickIxn, query } } = await clickIxnPromise
      let receiptTime = now()
      interactionTree = clickIxn[0]
      expect(interactionTree.id).toBeTruthy()
      expect(interactionTree.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)).toBeTruthy()
      expect(interactionTree.nodeId).toBeTruthy()

      expect(interactionTree.end).toBeGreaterThanOrEqual(interactionTree.start)
      expect(interactionTree.callbackEnd).toBeGreaterThanOrEqual(interactionTree.start)
      expect(interactionTree.end).toBeLessThanOrEqual(interactionTree.end)
      expect(interactionTree.children.length).toEqual(1)

      const xhr = interactionTree.children[0]

      expect(xhr.nodeId).toBeTruthy()
      expect(xhr.type).toEqual('ajax') //, 'should be an ajax node')
      expect(xhr.children.length).toEqual(0) //, 'should not have nested children')
      expect(xhr.method).toEqual('POST') // 'should be a POST request')
      expect(xhr.status).toEqual(200) // 'should have a 200 status')
      expect(xhr.domain.split(':')[0]).toEqual('bam-test-1.nr-local.net') // 'should have a correct hostname')
      var port = +xhr.domain.split(':')[1]
      expect(port > 1000 && port < 100000).toBeTruthy() //, 'port should be in expected range')
      expect(xhr.requestBodySize).toEqual(3) // 'should have correct requestBodySize')
      expect(xhr.responseBodySize).toEqual(3) // 'should have correct responseBodySize')
      expect(xhr.requestedWith).toEqual('XMLHttpRequest') // 'should indicate it was requested with xhr')

      let fixup = receiptTime - query.rst
      let estimatedInteractionTimestamp = interactionTree.start + fixup
      expect(estimatedInteractionTimestamp).toBeGreaterThan(testStartTime) //, 'estimated ixn start after test start')
      expect(estimatedInteractionTimestamp).toBeLessThan(receiptTime) //, 'estimated ixn start before receipt time')
    })

    it('contains nav and paint timings based on category', async () => {
      const browserIxnsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
      const url = await browser.testHandle.assetURL('spa/xhr.html')
      await browser.url(url).then(() => browser.waitForAgentLoad())
      $('body').click()

      const ixns = await browserIxnsCapture.waitForResult({ totalCount: 2 })
      const [{ request: { body: [ipl] } }, { request: { body: [rc] } }] = ixns

      expect(ipl.trigger).toEqual('initialPageLoad')
      expect(ipl.navTiming).toEqual(expect.any(Object))
      if (browserMatch(supportsFirstPaint)) expect(ipl.firstPaint).toBeGreaterThan(0)
      else expect(ipl.firstPaint).toBeNull()
      if (browserMatch(supportsFirstContentfulPaint)) expect(ipl.firstContentfulPaint).toBeGreaterThan(0)
      else expect(ipl.firstContentfulPaint).toBeNull()

      expect(rc.category).toEqual('Route change')
      expect(rc.navTiming).toBeNull()
      expect(rc.firstPaint).toBeNull()
      expect(rc.firstContentfulPaint).toBeNull()
    })

    it('child nodes in SPA interaction does not exceed set limit', async () => {
      const [{ request: { body: IPL } }] = await Promise.all([
        browser.testHandle.expectInteractionEvents(10000),
        await browser.url(
          await browser.testHandle.assetURL('spa/fetch-exceed-max-spa-nodes.html')
        ).then(() => browser.waitForAgentLoad())
      ])
      let interactionTree = IPL[0]
      expect(interactionTree.trigger).toEqual('initialPageLoad')
      expect(interactionTree.children[0].path.startsWith('/1/')).toEqual(true)
      expect(interactionTree.isRouteChange).not.toBeTruthy()

      const clickIxnPromise = browser.testHandle.expectInteractionEvents(10000)
      await $('body').click()
      const { request: { body: clickIxn } } = await clickIxnPromise

      interactionTree = clickIxn[0]
      expect(interactionTree.children.length).toBeLessThanOrEqual(128)
    })

    it('promise wrapper should support instanceof comparison', async () => {
      await browser.url(
        await browser.testHandle.assetURL('promise-instanceof.html')
      ).then(() => browser.waitForAgentLoad())

      await browser.waitUntil(() => browser.execute(function () {
        return window.isNewPromise && window.isPromiseResolve && window.isFetchPromise && window.isAsyncPromise
      }),
      {
        timeout: 10000,
        timeoutMsg: 'Conditions never passed'
      })
    })
  })

  describe('errors', () => {
    it('captures error on initial page load', async () => {
      const [{ request: { body: IPL } }, { request: { body: errorBody } }] = await Promise.all([
        browser.testHandle.expectInteractionEvents(10000),
        browser.testHandle.expectErrors(10000),
        await browser.url(
          await browser.testHandle.assetURL('spa/errors/captured-initial-page-load.html')
        ).then(() => browser.waitForAgentLoad())
      ])
      let interactionTree = IPL[0]
      expect(interactionTree.trigger).toEqual('initialPageLoad')

      var interactionId = interactionTree.id
      var interactionNodeId = interactionTree.nodeId
      expect(interactionId).not.toEqual(null)
      expect(interactionNodeId).not.toEqual(null)

      var interactionChildren = interactionTree.children
      expect(interactionChildren.length).toEqual(2)
      var tracer = interactionChildren[0]
      expect(tracer.type).toEqual('customTracer')
      expect(tracer.nodeId).not.toEqual(null)

      var error = errorBody.err[0]
      expect(error.params.message).toEqual('initial page load error')
      expect(error.params.browserInteractionId).toEqual(interactionId)// 'should have the correct interaction id')
      expect(error.params.parentNodeId).not.toBeTruthy()
    })

    it('captures error in root node', async () => {
      const [browserIxnsCapture, errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInteractionEventsRequest },
        { test: testErrorsRequest }
      ])

      const [ixns, [{ request: { body: errorBody } }]] = await Promise.all([
        browserIxnsCapture.waitForResult({ totalCount: 2 }),
        errorsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(
          await browser.testHandle.assetURL('spa/errors/captured-root.html')
        )
          .then(() => browser.waitForAgentLoad())
          .then(() => $('body').click())
      ])

      const interactionTree = ixns.find(x => x.request.body[0].trigger !== 'initialPageLoad').request.body[0]

      expect(errorBody.err.length).toEqual(1)

      var interactionId = interactionTree.id
      var interactionNodeId = interactionTree.nodeId
      expect(interactionId).not.toEqual(null)
      expect(interactionNodeId).not.toEqual(null)

      var error = errorBody.err[0]
      expect(error.params.message).toEqual('some error')
      expect(error.params.browserInteractionId).toEqual(interactionId)// 'should have the correct interaction id')
      expect(error.params.parentNodeId).not.toBeTruthy()
    })

    it('captures error in xhr', async () => {
      const [browserIxnsCapture, errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInteractionEventsRequest },
        { test: testErrorsRequest }
      ])

      const [ixns, [{ request: { body: errorBody } }]] = await Promise.all([
        browserIxnsCapture.waitForResult({ totalCount: 2 }),
        errorsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(
          await browser.testHandle.assetURL('spa/errors/captured-xhr.html')
        )
          .then(() => browser.waitForAgentLoad())
          .then(() => browser.pause(1000))
          .then(() => $('body').click())
      ])

      const interactionTree = ixns.find(x => x.request.body[0].trigger !== 'initialPageLoad').request.body[0]

      expect(errorBody.err.length).toEqual(1)

      var interactionId = interactionTree.id
      var interactionNodeId = interactionTree.children[0].nodeId
      expect(interactionId).not.toEqual(null)
      expect(interactionNodeId).not.toEqual(null)

      var error = errorBody.err[0]
      expect(error.params.message).toEqual('some error')
      expect(error.params.browserInteractionId).toEqual(interactionId)// 'should have the correct interaction id')
      expect(error.params.parentNodeId).toEqual(interactionNodeId)
      expect(error.metrics.count).toEqual(1)
    })

    it('captures error in tracer callback fn', async () => {
      const [browserIxnsCapture, errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInteractionEventsRequest },
        { test: testErrorsRequest }
      ])

      const [ixns, [{ request: { body: errorBody } }]] = await Promise.all([
        browserIxnsCapture.waitForResult({ totalCount: 2 }),
        errorsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(
          await browser.testHandle.assetURL('spa/errors/captured-custom.html')
        )
          .then(() => browser.waitForAgentLoad())
          .then(() => $('body').click())
      ])

      const interactionTree = ixns.find(x => x.request.body[0].trigger !== 'initialPageLoad').request.body[0]

      expect(errorBody.err.length).toEqual(1)

      var interactionId = interactionTree.id
      var interactionNodeId = interactionTree.children[0].nodeId
      expect(interactionId).not.toEqual(null)
      expect(interactionNodeId).not.toEqual(null)

      var error = errorBody.err[0]
      expect(error.params.message).toEqual('some error')
      expect(error.params.browserInteractionId).toEqual(interactionId)// 'should have the correct interaction id')
      expect(error.params.parentNodeId).toEqual(interactionNodeId)
      expect(error.metrics.count).toEqual(1)
    })

    it('captures string error in tracer callback fn', async () => {
      const [browserIxnsCapture, errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInteractionEventsRequest },
        { test: testErrorsRequest }
      ])

      const [ixns, [{ request: { body: errorBody } }]] = await Promise.all([
        browserIxnsCapture.waitForResult({ totalCount: 2 }),
        errorsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(
          await browser.testHandle.assetURL('spa/errors/captured-custom-string.html')
        )
          .then(() => browser.waitForAgentLoad())
          .then(() => $('body').click())
      ])

      const interactionTree = ixns.find(x => x.request.body[0].trigger !== 'initialPageLoad').request.body[0]

      expect(errorBody.err.length).toEqual(1)

      var interactionId = interactionTree.id
      var interactionNodeId = interactionTree.children[0].nodeId
      expect(interactionId).not.toEqual(null)
      expect(interactionNodeId).not.toEqual(null)

      var error = errorBody.err[0]
      expect(error.params.message).toEqual('some error')
      expect(error.params.browserInteractionId).toEqual(interactionId)// 'should have the correct interaction id')
      expect(error.params.parentNodeId).toEqual(interactionNodeId)
      expect(error.metrics.count).toEqual(1)
    })

    it('still handles errors in discarded SPA interactions', async () => {
      const [errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testErrorsRequest }
      ])

      const [[{ request: { body: errorBody } }]] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(
          await browser.testHandle.assetURL('spa/errors/discarded-interaction.html')
        )
          .then(() => browser.waitForAgentLoad())
          .then(() => $('body').click())
      ])

      expect(errorBody.err.length).toEqual(1)

      var error = errorBody.err[0]
      expect(error.params.message).toEqual('some error')
      expect(error.params.browserInteractionId).not.toBeTruthy()
      expect(error.params.parentNodeId).not.toBeTruthy()
      expect(error.metrics.count).toEqual(1)
    })

    it('still captures errors outside of interactions', async () => {
      const [errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testErrorsRequest }
      ])

      const [[{ request: { body: errorBody } }]] = await Promise.all([
        errorsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(
          await browser.testHandle.assetURL('spa/errors/captured-nointeraction.html')
        )
          .then(() => browser.waitForAgentLoad())
          .then(() => $('body').click())
      ])

      expect(errorBody.err.length).toEqual(1)

      var error = errorBody.err[0]
      expect(error.params.message).toEqual('some error')
      expect(error.params.browserInteractionId).not.toBeTruthy()
      expect(error.params.parentNodeId).not.toBeTruthy()
      expect(error.metrics.count).toEqual(1)
    })

    it('captures same error in multiple interactions', async () => {
      const [browserIxnsCapture, errorsCapture] = await browser.testHandle.createNetworkCaptures('bamServer', [
        { test: testInteractionEventsRequest },
        { test: testErrorsRequest }
      ])

      const [ixns, [{ request: { body: errorBody } }]] = await Promise.all([
        browserIxnsCapture.waitForResult({ totalCount: 3 }),
        errorsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(
          await browser.testHandle.assetURL('spa/errors/captured-custom.html')
        )
          .then(() => browser.waitForAgentLoad())
          .then(() => $('body').click())
          .then(() => browser.pause(1000))
          .then(() => $('body').click())
      ])

      const interactionTrees = ixns.filter(x => x.request.body[0].trigger !== 'initialPageLoad')

      const ixn1 = interactionTrees[0].request.body[0]
      const ixn2 = interactionTrees[1].request.body[0]

      var interactionId = ixn1.id
      var interactionNodeId = ixn1.children[0].nodeId
      expect(interactionId).not.toEqual(null)
      expect(interactionNodeId).not.toEqual(null)

      var interactionId2 = ixn2.id
      var interactionNodeId2 = ixn2.children[0].nodeId
      expect(interactionId2).not.toEqual(null)
      expect(interactionNodeId2).not.toEqual(null)

      expect(errorBody.err.length).toEqual(2)
      var error1 = errorBody.err[0]
      var error2 = errorBody.err[1]
      expect(error1.params.browserInteractionId).toEqual(interactionId)// 'should have the correct interaction id')
      expect(error2.params.browserInteractionId).toEqual(interactionId2)// 'should have the correct interaction id')
    })
  })
})
