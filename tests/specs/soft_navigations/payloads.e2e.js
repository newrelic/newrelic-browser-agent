import { notSafari, supportsFirstPaint } from '../../../tools/browser-matcher/common-matchers.mjs'
import { testInteractionEventsRequest, testErrorsRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('attribution tests', () => {
  const config = { loader: 'spa', init: { feature_flags: ['soft_nav'] } }
  let interactionsCapture

  beforeEach(async () => {
    interactionsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testInteractionEventsRequest })
  })

  describe('action-text', () => {
    const configWithDenyList = {
      loader: 'spa',
      init: {
        feature_flags: ['soft_nav'],
        ajax: {
          deny_list: ['bam-test-1.nr-local.net']
        }
      }
    }

    it('captures innerText', async () => {
      let [interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 1 }),
        browser.url(
          await browser.testHandle.assetURL('soft_navigations/action-text.html', configWithDenyList)
        ).then(() => browser.waitForAgentLoad())
      ])
      const ipl = interactionHarvests[0].request.body[0]

      expect(ipl.trigger).toEqual('initialPageLoad')
      expect(ipl.children.length).toEqual(0)
      expect(ipl.isRouteChange).not.toBeTruthy()

      ;[interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 2 }),
        $('#one').click()
      ])
      const rc = interactionHarvests[1].request.body[0]

      expect(rc.children.length).toEqual(1)
      expect(rc.children[0]).toMatchObject({
        type: 'stringAttribute',
        key: 'actionText',
        value: '#1'
      })
    })

    it('captures value', async () => {
      let [interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 1 }),
        browser.url(
          await browser.testHandle.assetURL('soft_navigations/action-text.html', configWithDenyList)
        ).then(() => browser.waitForAgentLoad())
      ])
      const ipl = interactionHarvests[0].request.body[0]

      expect(ipl.trigger).toEqual('initialPageLoad')
      expect(ipl.children.length).toEqual(0)
      expect(ipl.isRouteChange).not.toBeTruthy()

      ;[interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 2 }),
        $('#two').click()
      ])
      const rc = interactionHarvests[1].request.body[0]

      expect(rc.children.length).toEqual(1)
      expect(rc.children[0]).toMatchObject({
        type: 'stringAttribute',
        key: 'actionText',
        value: '#2'
      })
    })

    it('captures title', async () => {
      let [interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 1 }),
        browser.url(
          await browser.testHandle.assetURL('soft_navigations/action-text.html', configWithDenyList)
        ).then(() => browser.waitForAgentLoad())
      ])
      const ipl = interactionHarvests[0].request.body[0]

      expect(ipl.trigger).toEqual('initialPageLoad')
      expect(ipl.children.length).toEqual(0)
      expect(ipl.isRouteChange).not.toBeTruthy()

      ;[interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 2 }),
        $('#three').click()
      ])
      const rc = interactionHarvests[1].request.body[0]

      expect(rc.children.length).toEqual(1)
      expect(rc.children[0]).toMatchObject({
        type: 'stringAttribute',
        key: 'actionText',
        value: '#3'
      })
    })

    it('does not capture body text', async () => {
      let [interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 1 }),
        browser.url(
          await browser.testHandle.assetURL('soft_navigations/action-text.html', configWithDenyList)
        ).then(() => browser.waitForAgentLoad())
      ])
      const ipl = interactionHarvests[0].request.body[0]

      expect(ipl.trigger).toEqual('initialPageLoad')
      expect(ipl.children.length).toEqual(0)
      expect(ipl.isRouteChange).not.toBeTruthy()

      ;[interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 2 }),
        $('body').click()
      ])
      const rc = interactionHarvests[1].request.body[0]

      expect(rc.children.length).toEqual(0)
    })
  })

  describe('basic tests', () => {
    it('contains nav and paint timings based on category', async () => {
      const [interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 2 }),
        await browser.url(
          await browser.testHandle.assetURL('soft_navigations/soft-nav-interaction-on-click.html', config)
        ).then(() => browser.waitForAgentLoad()),
        // Perform click after the initial page load interaction is captured
        interactionsCapture.waitForResult({ totalCount: 1 })
          .then(() => $('body').click())
      ])

      const [{ request: { body: [ipl] } }, { request: { body: [rc] } }] = interactionHarvests

      expect(ipl.trigger).toEqual('initialPageLoad')
      expect(ipl.navTiming).toEqual(expect.any(Object))
      if (browserMatch(supportsFirstPaint)) expect(ipl.firstPaint).toBeGreaterThan(0)
      else expect(ipl.firstPaint).toBeNull()
      expect(ipl.firstContentfulPaint).toBeGreaterThan(0)

      expect(rc.category).toEqual('Route change')
      expect(rc.navTiming).toBeNull()
      expect(rc.firstPaint).toBeNull()
      expect(rc.firstContentfulPaint).toBeNull()
    })
  })

  // Safari (via LT) has a weird behavior of a very large timeStamp value for UI event which makes the interaction start nonsense. This results in an inability to associate ajax & errors.
  describe.withBrowsersMatching(notSafari)('errors', () => {
    let errorMetricsCapture

    beforeEach(async () => {
      errorMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
    })

    it('captures error in xhr', async () => {
      const [ixns, [{ request: { body: errorBody } }]] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 2 }),
        errorMetricsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(
          await browser.testHandle.assetURL('soft_navigations/errors/captured-xhr.html', config)
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
      expect(error.params.browserInteractionId).toEqual(interactionId) // 'should have the correct interaction id'
      // expect(error.params.parentNodeId).toEqual(interactionNodeId) // there's no parentNodeId in soft nav but is left here in case it's re-added
      expect(error.metrics.count).toEqual(1)
    })

    it('captures same error in multiple interactions', async () => {
      const [ixns, [{ request: { body: errorBody } }]] = await Promise.all([
        interactionsCapture.waitForResult({ totalCount: 2 }),
        errorMetricsCapture.waitForResult({ totalCount: 1 }),
        browser.url(
          await browser.testHandle.assetURL('soft_navigations/errors/captured-custom.html', config)
        ).then(() => browser.waitForAgentLoad())
          .then(() => $('body').click())
          .then(() => browser.pause(1000))
          .then(() => $('body').click())
      ])

      const interactionTrees = ixns.filter(x => x.request.body[0].trigger !== 'initialPageLoad')

      const ixn1 = interactionTrees[0].request.body[0]
      const ixn2 = interactionTrees[0].request.body[1] // there should be 2 interactions in the 2nd payload

      const interactionId = ixn1.id
      expect(interactionId).not.toEqual(null)
      const interactionId2 = ixn2.id
      expect(interactionId2).not.toEqual(null)

      expect(errorBody.err.length).toEqual(2)
      var error1 = errorBody.err[0]
      var error2 = errorBody.err[1]
      expect(error1.params.browserInteractionId).toEqual(interactionId) // 'should have the correct interaction id'
      expect(error2.params.browserInteractionId).toEqual(interactionId2) // 'should have the correct interaction id'
    })
  })
})
