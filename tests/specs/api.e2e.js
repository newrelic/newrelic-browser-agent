const { getTime } = require('../functional/uncat-internal-help.cjs')
const { getErrorsFromResponse } = require('../functional/err/assertion-helpers')

describe('newrelic api', () => {
  let testHandle
  const init = {
    ajax: { deny_list: [], harvestTimeSeconds: 2 },
    jserrors: { harvestTimeSeconds: 2 },
    metrics: { harvestTimeSeconds: 2 },
    page_action: { harvestTimeSeconds: 2 },
    page_view_timing: { harvestTimeSeconds: 2 },
    session_trace: { harvestTimeSeconds: 2 },
    spa: { harvestTimeSeconds: 2 }
  }

  beforeEach(async () => {
    testHandle = await browser.getTestHandle()
  })

  afterEach(async () => {
    await testHandle.destroy()
  })

  it('should load when sessionStorage is not available', async () => {
    const url = await testHandle.assetURL('api/session-storage-disallowed.html', {
      loader: 'spa',
      init
    })

    await Promise.all([
      testHandle.expectRum(),
      browser.url(url)
    ])
    const result = await browser.execute(() => {
      return typeof window.newrelic.addToTrace === 'function'
    })

    expect(result).toEqual(true)
  })

  describe('setPageViewName api', () => {
    it('customTransactionName 1 arg', async () => {
      const url = await testHandle.assetURL('api.html', {
        loader: 'spa',
        init
      })

      const rumPromise = testHandle.expectRum()
      const eventsPromise = testHandle.expectEvents()
      const timeSlicePromise = testHandle.expectAjaxTimeSlices()
      const resourcesPromise = testHandle.expectResources()

      await Promise.all([
        browser.url(url),
        rumPromise,
        eventsPromise,
        timeSlicePromise,
        resourcesPromise
      ])

      expect((await rumPromise).request.query.ct).toEqual('http://custom.transaction/foo')
      expect((await eventsPromise).request.query.ct).toEqual('http://custom.transaction/foo')
      expect((await timeSlicePromise).request.query.ct).toEqual('http://custom.transaction/foo')
      expect((await resourcesPromise).request.query.ct).toEqual('http://custom.transaction/foo')
    })

    it('customTransactionName 1 arg unload', async () => {
      const url = await testHandle.assetURL('api.html', {
        loader: 'spa',
        init
      })
      const unloadUrl = await testHandle.assetURL('/', {
        loader: 'spa',
        init
      })

      await browser.url(url)
      const metricsPromise = testHandle.expectCustomMetrics()
      await browser.url(unloadUrl)
      const { request: { body, query } } = await metricsPromise
      const time = getTime(body ? JSON.parse(body)?.cm : JSON.parse(query.cm))

      expect(query.ct).toEqual('http://custom.transaction/foo')
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })

    it('customTransactionName 2 arg', async () => {
      const url = await testHandle.assetURL('api2.html', {
        loader: 'spa',
        init
      })
      const unloadUrl = await testHandle.assetURL('/', {
        loader: 'spa',
        init
      })

      await browser.url(url)
      const metricsPromise = testHandle.expectCustomMetrics()
      await browser.url(unloadUrl)
      const { request: { body, query } } = await metricsPromise
      const time = getTime(body ? JSON.parse(body)?.cm : JSON.parse(query.cm))

      expect(query.ct).toEqual('http://bar.baz/foo')
      expect(typeof time).toEqual('number')
      expect(time).toBeGreaterThan(0)
    })
  })

  describe('noticeError api', () => {
    it('takes an error object', async () => {
      const url = await testHandle.assetURL('api.html', {
        loader: 'spa',
        init
      })

      const errorsPromise = testHandle.expectErrors()
      await browser.url(url)
      const { request } = await errorsPromise
      const errorData = getErrorsFromResponse(request)
      const params = errorData[0] && errorData[0]['params']

      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('no free taco coupons')
    })

    it('takes a string', async () => {
      const url = await testHandle.assetURL('api/noticeError.html', {
        loader: 'spa',
        init
      })

      const errorsPromise = testHandle.expectErrors()
      await browser.url(url)
      const { request } = await errorsPromise
      const errorData = getErrorsFromResponse(request)
      const params = errorData[0] && errorData[0]['params']

      expect(params.exceptionClass).toEqual('Error')
      expect(params.message).toEqual('too many free taco coupons')
    })
  })
})
