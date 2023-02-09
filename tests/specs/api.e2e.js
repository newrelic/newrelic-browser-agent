const { getTime } = require('../functional/uncat-internal-help.cjs')
const { getErrorsFromResponse } = require('../functional/err/assertion-helpers')

let testHandle

beforeEach(async () => {
  testHandle = await browser.getTestHandle()
})

afterEach(async () => {
  await testHandle.destroy()
})

// browser becomes one of 
// jest unit test <-- if its not testing integrations?
// OR a "functional" test <--- if its integrating with the browser or other features in some way?

describe('setPageViewName api', () => {
  const init = {
    // ajax: { enabled: false },
    // distributed_tracing: { enabled: false },
    // jserrors: { enabled: false },
    metrics: { enabled: true, harvestTimeSeconds: 2 },
    // page_action: { enabled: false },
    page_view_event: { enabled: true, harvestTimeSeconds: 2 }
    // page_view_timing: { enabled: false },
    // session_trace: { enabled: false },
    // spa: { enabled: false }
  }

  it('customTransactionName 1 arg', async () => {
    const url = await testHandle.assetURL('api.html', {
      init
    })

    const rumPromise = testHandle.expectRum()
    await browser.url(url)
    const { request: { query } } = await rumPromise

    expect(query.ct).toEqual('http://custom.transaction/foo')
  })

  it('customTransactionName 1 arg unload', async () => {
    const url = await testHandle.assetURL('api.html', {
      init
    })

    const metricsPromise = testHandle.expectMetrics()
    await browser.url(url)
    const { request: { body, query } } = await metricsPromise
    const time = getTime(body ? JSON.parse(body)?.cm : JSON.parse(query.cm))

    expect(query.ct).toEqual('http://custom.transaction/foo')
    expect(typeof time).toEqual('number')
    expect(time).toBeGreaterThan(0)
  })

  it('customTransactionName 2 arg', async () => {
    const url = await testHandle.assetURL('api2.html', {
      init
    })

    const rumPromise = testHandle.expectRum()
    const metricsPromise = testHandle.expectMetrics()
    await browser.url(url)
    await rumPromise
    const { request: { body, query } } = await metricsPromise
    const time = getTime(body ? JSON.parse(body)?.cm : JSON.parse(query.cm))

    expect(query.ct).toEqual('http://bar.baz/foo')
    expect(typeof time).toEqual('number')
    expect(time).toBeGreaterThan(0)
  })
})

describe('noticeError api', () => {
  const init = {
    // ajax: { enabled: false },
    // distributed_tracing: { enabled: false },
    jserrors: { enabled: true, harvestTimeSeconds: 2 },
    // metrics: { enabled: false },
    // page_action: { enabled: false },
    page_view_event: { enabled: true, harvestTimeSeconds: 2 }
    // page_view_timing: { enabled: false },
    // session_trace: { enabled: false },
    // spa: { enabled: false } <--- harvestTimeSeconds needs to be added
  }

  it('takes an error object', async () => {
    const url = await testHandle.assetURL('api.html', {
      init
    })

    const rumPromise = testHandle.expectRum()
    const errorsPromise = testHandle.expectErrors()
    await browser.url(url)
    await rumPromise
    const { request } = await errorsPromise
    const errorData = getErrorsFromResponse(request, browser)
    const params = errorData[0] && errorData[0]['params']

    expect(params.exceptionClass).toEqual('Error')
    expect(params.message).toEqual('no free taco coupons')
  })

  it('takes an error object', async () => {
    const url = await testHandle.assetURL('api/noticeError.html', {
      init
    })

    const rumPromise = testHandle.expectRum()
    const errorsPromise = testHandle.expectErrors()
    await browser.url(url)
    await rumPromise
    const { request } = await errorsPromise
    const errorData = getErrorsFromResponse(request, browser)
    const params = errorData[0] && errorData[0]['params']

    expect(params.exceptionClass).toEqual('Error')
    expect(params.message).toEqual('too many free taco coupons')
  })
})
