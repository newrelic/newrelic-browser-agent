import { config } from '../util/defaults'

describe('newrelic api', () => {
  let testHandle

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  it('should load when sessionStorage is not available', async () => {
    await Promise.all([
      testHandle.expectRum(),
      browser.url(await testHandle.assetURL('api/local-storage-disallowed.html', config)) // Setup expects before loading the page
    ])

    const result = await browser.execute(function () {
      return typeof window.newrelic.addToTrace === 'function'
    })

    expect(result).toEqual(true)
  })

  describe('setPageViewName api', () => {
    it('customTransactionName 1 arg', async () => {
      const [rumResults, resourcesResults, eventsResults, ajaxResults] = await Promise.all([
        testHandle.expectRum(),
        testHandle.expectResources(),
        testHandle.expectEvents(),
        testHandle.expectAjaxTimeSlices(),
        browser.url(await testHandle.assetURL('api.html', config)) // Setup expects before loading the page
      ])

      expect(rumResults.request.query.ct).toEqual('http://custom.transaction/foo')
      expect(resourcesResults.request.query.ct).toEqual('http://custom.transaction/foo')
      expect(eventsResults.request.query.ct).toEqual('http://custom.transaction/foo')
      expect(ajaxResults.request.query.ct).toEqual('http://custom.transaction/foo')
    })

    it('customTransactionName 1 arg unload', async () => {
      await Promise.all([
        testHandle.expectRum(),
        browser.url(await testHandle.assetURL('api.html', config))
      ])

      const [unloadCustomMetricsResults] = await Promise.all([
        testHandle.expectCustomMetrics(),
        await browser.url(await testHandle.assetURL('/')) // Setup expects before navigating
      ])

      expect(unloadCustomMetricsResults.request.query.ct).toEqual('http://custom.transaction/foo')
      expect(Array.isArray(unloadCustomMetricsResults.request.body.cm)).toEqual(true)
      expect(unloadCustomMetricsResults.request.body.cm.length).toBeGreaterThan(0)

      const time = unloadCustomMetricsResults.request.body.cm[0].metrics?.time?.t
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })

    it('customTransactionName 2 arg unload', async () => {
      await Promise.all([
        testHandle.expectRum(),
        browser.url(await testHandle.assetURL('api2.html', config))
      ])

      const [unloadCustomMetricsResults] = await Promise.all([
        testHandle.expectCustomMetrics(),
        await browser.url(await testHandle.assetURL('/')) // Setup expects before navigating
      ])

      expect(unloadCustomMetricsResults.request.query.ct).toEqual('http://bar.baz/foo')
      expect(Array.isArray(unloadCustomMetricsResults.request.body.cm)).toEqual(true)
      expect(unloadCustomMetricsResults.request.body.cm.length).toBeGreaterThan(0)

      const time = unloadCustomMetricsResults.request.body.cm[0].metrics?.time?.t
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })
  })

  describe('noticeError api', () => {
    it('takes an error object', async () => {
      const [errorsResults] = await Promise.all([
        testHandle.expectErrors(),
        browser.url(await testHandle.assetURL('api.html', config)) // Setup expects before loading the page
      ])

      expect(Array.isArray(errorsResults.request.body.err)).toEqual(true)
      expect(errorsResults.request.body.err.length).toBeGreaterThan(0)

      const params = errorsResults.request.body.err[0].params

      expect(params).toBeDefined()
      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('no free taco coupons')
    })

    it('takes a string', async () => {
      const [errorsResults] = await Promise.all([
        testHandle.expectErrors(),
        browser.url(await testHandle.assetURL('api/noticeError.html', config)) // Setup expects before loading the page
      ])

      expect(Array.isArray(errorsResults.request.body.err)).toEqual(true)
      expect(errorsResults.request.body.err.length).toBeGreaterThan(0)

      const params = errorsResults.request.body.err[0].params

      expect(params).toBeDefined()
      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('too many free taco coupons')
    })
  })
})
