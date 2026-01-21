import { testAjaxTimeSlicesRequest, testCustomMetricsRequest, testEventsRequest, testRumRequest } from '../../../tools/testing-server/utils/expect-tests'

describe('newrelic api', () => {
  afterEach(async () => {
    await browser.destroyAgentSession()
  })

  describe('setPageViewName()', () => {
    it('includes the 1st argument (page name) in rum, resources, events, and ajax calls', async () => {
      const [rumCapture, eventsCapture, ajaxCapture] =
        await browser.testHandle.createNetworkCaptures('bamServer', [
          { test: testRumRequest },
          { test: testEventsRequest },
          { test: testAjaxTimeSlicesRequest }
        ])

      const [rumResults, eventsResults, ajaxResults] = await Promise.all([
        rumCapture.waitForResult({ totalCount: 1 }),
        eventsCapture.waitForResult({ totalCount: 1 }),
        ajaxCapture.waitForResult({ totalCount: 1 }),
        browser.url(await browser.testHandle.assetURL('api.html')) // Setup expects before loading the page
          .then(() => browser.waitForAgentLoad())
      ])

      expect(rumResults[0].request.query.ct).toEqual('http://custom.transaction/foo')
      expect(eventsResults[0].request.query.ct).toEqual('http://custom.transaction/foo')
      expect(ajaxResults[0].request.query.ct).toEqual('http://custom.transaction/foo')
    })

    it('includes the 1st argument (page name) in metrics call on unload', async () => {
      await browser.url(await browser.testHandle.assetURL('api.html'))
        .then(() => browser.waitForAgentLoad())

      const customMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
        test: testCustomMetricsRequest
      })
      const [unloadCustomMetricsResults] = await Promise.all([
        customMetricsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
      ])

      expect(unloadCustomMetricsResults[0].request.query.ct).toEqual('http://custom.transaction/foo')
      expect(Array.isArray(unloadCustomMetricsResults[0].request.body.cm)).toEqual(true)
      expect(unloadCustomMetricsResults[0].request.body.cm.length).toBeGreaterThan(0)

      const time = unloadCustomMetricsResults[0].request.body.cm[0].metrics?.time?.t
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })

    it('includes the optional 2nd argument for host in metrics call on unload', async () => {
      const customMetricsCapture = await browser.testHandle.createNetworkCaptures('bamServer', {
        test: testCustomMetricsRequest
      })
      await browser.url(await browser.testHandle.assetURL('api2.html'))
        .then(() => browser.waitForAgentLoad())

      const [unloadCustomMetricsResults] = await Promise.all([
        customMetricsCapture.waitForResult({ totalCount: 1 }),
        await browser.url(await browser.testHandle.assetURL('/')) // Setup expects before navigating
      ])

      expect(unloadCustomMetricsResults[0].request.query.ct).toEqual('http://bar.baz/foo')
      expect(Array.isArray(unloadCustomMetricsResults[0].request.body.cm)).toEqual(true)
      expect(unloadCustomMetricsResults[0].request.body.cm.length).toBeGreaterThan(0)

      const time = unloadCustomMetricsResults[0].request.body.cm[0].metrics?.time?.t
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })
  })
})
