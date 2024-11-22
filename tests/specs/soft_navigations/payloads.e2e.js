import { supportsFirstPaint } from '../../../tools/browser-matcher/common-matchers.mjs'
import { JSONPath } from 'jsonpath-plus'
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
      const [interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ timeout: 10000 }),
        await browser.url(
          await browser.testHandle.assetURL('soft_navigations/action-text.html', configWithDenyList)
        ).then(() => browser.waitForAgentLoad()),
        // Perform click after the initial page load interaction is captured
        interactionsCapture.waitForResult({ totalCount: 1 })
          .then(() => $('#one').click())
      ])

      const interactionEvents = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.type===\'interaction\')]', json: interactionHarvests })
      expect(interactionEvents.length).toEqual(2)

      expect(interactionEvents[0].trigger).toEqual('initialPageLoad')
      expect(interactionEvents[0].children.length).toEqual(0)
      expect(interactionEvents[0].isRouteChange).not.toBeTruthy()

      expect(interactionEvents[1].children.length).toEqual(1)
      expect(interactionEvents[1].children[0]).toMatchObject({
        type: 'stringAttribute',
        key: 'actionText',
        value: '#1'
      })
    })

    it('captures value', async () => {
      const [interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ timeout: 10000 }),
        await browser.url(
          await browser.testHandle.assetURL('soft_navigations/action-text.html', configWithDenyList)
        ).then(() => browser.waitForAgentLoad()),
        // Perform click after the initial page load interaction is captured
        interactionsCapture.waitForResult({ totalCount: 1 })
          .then(() => $('#two').click())
      ])

      const interactionEvents = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.type===\'interaction\')]', json: interactionHarvests })
      expect(interactionEvents.length).toEqual(2)

      expect(interactionEvents[0].trigger).toEqual('initialPageLoad')
      expect(interactionEvents[0].children.length).toEqual(0)
      expect(interactionEvents[0].isRouteChange).not.toBeTruthy()

      expect(interactionEvents[1].children.length).toEqual(1)
      expect(interactionEvents[1].children[0]).toMatchObject({
        type: 'stringAttribute',
        key: 'actionText',
        value: '#2'
      })
    })

    it('captures title', async () => {
      const [interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ timeout: 10000 }),
        await browser.url(
          await browser.testHandle.assetURL('soft_navigations/action-text.html', configWithDenyList)
        ).then(() => browser.waitForAgentLoad()),
        // Perform click after the initial page load interaction is captured
        interactionsCapture.waitForResult({ totalCount: 1 })
          .then(() => $('#three').click())
      ])

      const interactionEvents = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.type===\'interaction\')]', json: interactionHarvests })
      expect(interactionEvents.length).toEqual(2)

      expect(interactionEvents[0].trigger).toEqual('initialPageLoad')
      expect(interactionEvents[0].children.length).toEqual(0)
      expect(interactionEvents[0].isRouteChange).not.toBeTruthy()

      expect(interactionEvents[1].children.length).toEqual(1)
      expect(interactionEvents[1].children[0]).toMatchObject({
        type: 'stringAttribute',
        key: 'actionText',
        value: '#3'
      })
    })

    it('does not capture body text', async () => {
      const [interactionHarvests] = await Promise.all([
        interactionsCapture.waitForResult({ timeout: 10000 }),
        await browser.url(
          await browser.testHandle.assetURL('soft_navigations/action-text.html', configWithDenyList)
        ).then(() => browser.waitForAgentLoad()),
        // Perform click after the initial page load interaction is captured
        interactionsCapture.waitForResult({ totalCount: 1 })
          .then(() => $('body').click())
      ])

      const interactionEvents = JSONPath({ path: '$.[*].request.body.[?(!!@ && @.type===\'interaction\')]', json: interactionHarvests })
      expect(interactionEvents.length).toEqual(2)

      expect(interactionEvents[0].trigger).toEqual('initialPageLoad')
      expect(interactionEvents[0].children.length).toEqual(0)
      expect(interactionEvents[0].isRouteChange).not.toBeTruthy()

      expect(interactionEvents[1].children.length).toEqual(0)
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

  describe('errors', () => {
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
        interactionsCapture.waitForResult({ totalCount: 3 }),
        errorMetricsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(
          await browser.testHandle.assetURL('soft_navigations/errors/captured-custom.html', config)
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
      expect(error1.params.browserInteractionId).toEqual(interactionId) // 'should have the correct interaction id'
      expect(error2.params.browserInteractionId).toEqual(interactionId2) // 'should have the correct interaction id'
    })
  })
})
