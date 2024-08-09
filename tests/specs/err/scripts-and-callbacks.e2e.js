const { assertExpectedErrors, assertErrorAttributes } = require('./assertion-helper')
const { testErrorsRequest } = require('../../../tools/testing-server/utils/expect-tests')

describe('JSE Error detection in various callbacks', () => {
  let errorsCapture

  beforeEach(async () => {
    errorsCapture = await browser.testHandle.createNetworkCaptures('bamServer', { test: testErrorsRequest })
  })

  it('should report errors from event listener callbacks', async () => {
    const eventListenersURL = await browser.testHandle.assetURL('event-listener-error.html')
    const [[{ request: { body: errorBody } }]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(eventListenersURL)
        .then(() => browser.waitForAgentLoad())
    ])

    const expectedErrors = [
      {
        message: 'document addEventListener listener',
        stack: [
          { f: 'Object.handleEvent', u: eventListenersURL, l: 15 },
          { f: 'HTMLDocument.object', u: '<inline>', l: 13 }
        ]
      },
      {
        message: 'global addEventListener listener',
        stack: [
          { f: 'Object.handleEvent', u: eventListenersURL, l: 8 },
          { f: 'object', u: '<inline>', l: 13 }
        ]
      }
    ]

    expect(errorBody.err.length).toEqual(2)
    errorBody.err.forEach((e, i) => {
      expect(e.params.exceptionClass).toEqual('Error')
      expect(e.params.message).toEqual(expectedErrors[i].message)
      expect(e.params.stack_trace.includes('handleEvent')).toBeTruthy()
      expect(e.params.stack_trace.includes(eventListenersURL))
    })
    assertExpectedErrors(errorBody.err, expectedErrors, eventListenersURL)
  })

  it('should report uncaught errors from external scripts', async () => {
    const pageUrl = await browser.testHandle.assetURL('external-uncaught-error.html')
    const [[{ request: { body: errorBody, query: errorQuery } }]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(pageUrl)
        .then(() => browser.waitForAgentLoad())
    ])
    expect(errorBody.err.length).toEqual(1)
    let stackTrace = errorBody.err[0].params.stack_trace
    expect(stackTrace.indexOf(errorQuery)).toEqual(-1)
  })

  it('should report uncaught errors from inline scripts', async () => {
    const pageUrl = await browser.testHandle.assetURL('inline-uncaught-error.html')
    const [[{ request: { body: errorBody, query: errorQuery } }]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(pageUrl)
        .then(() => browser.waitForAgentLoad())
    ])
    expect(errorBody.err.length).toEqual(1)
    let stackTrace = errorBody.err[0].params.stack_trace
    expect(stackTrace.indexOf(errorQuery)).toEqual(-1)
  })

  it('should report errors from setInterval callbacks', async () => {
    const pageUrl = await browser.testHandle.assetURL('set-interval-error.html')
    const [[{ request: { body: errorBody } }]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(pageUrl)
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.waitUntil(
          () => browser.execute(function () {
            return window.intervalFired
          }),
          {
            timeout: 30000,
            timeoutMsg: 'window.intervalFired was never set'
          }))
    ])

    const expectedErrors = [
      {
        message: 'interval callback',
        stack: [{
          u: pageUrl,
          l: 10
        }]
      }
    ]

    assertExpectedErrors(errorBody.err, expectedErrors, pageUrl)
  })

  it('should report errors from setTimeout callbacks', async () => {
    const pageUrl = await browser.testHandle.assetURL('set-timeout-error.html')
    const [[{ request: { body: errorBody } }]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(pageUrl)
        .then(() => browser.waitForAgentLoad())
        .then(() => browser.waitUntil(
          () => browser.execute(function () {
            return window.setTimeoutFired
          }),
          {
            timeout: 30000,
            timeoutMsg: 'window.setTimeoutFired was never set'
          }))
    ])

    const expectedErrors = [
      {
        name: 'Error',
        message: 'timeout callback',
        stack: [{
          u: pageUrl,
          l: 9
        }]
      }
    ]

    assertExpectedErrors(errorBody.err, expectedErrors, pageUrl)
  })

  it('should report uncaught errors in callbacks', async () => {
    const pageUrl = await browser.testHandle.assetURL('uncaught.html')
    const [[{ request: { body: errorBody } }]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(pageUrl)
        .then(() => browser.waitForAgentLoad())
    ])

    const expectedErrorMessages = [
      { message: 'original onerror', tested: false },
      { message: 'uncaught error', tested: false },
      { message: 'original return abc', tested: false }
    ]
    errorBody.err.forEach(err => {
      const targetError = expectedErrorMessages.find(x => x.message === err.params.message)
      if (targetError) targetError.tested = true
      expect(!!targetError).toBeTruthy()
      expect(!!err.params.stack_trace).toBeTruthy()
      expect(!!err.params.stackHash).toBeTruthy()
      // fake has different exceptionClass than the others.... so check
      if (err.params.message === 'fake') expect(err.params.exceptionClass !== 'Error').toBeTruthy()
      else expect(err.params.exceptionClass === 'Error').toBeTruthy()
    })
    expect(expectedErrorMessages.every(x => x.tested)).toBeTruthy()
  })

  it('should report unhandledPromiseRejections that are readable', async () => {
    const pageUrl = await browser.testHandle.assetURL('unhandled-promise-rejection-readable.html')
    const [[{ request: { body: errorBody, query: errorQuery } }]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(pageUrl)
        .then(() => browser.waitForAgentLoad())
    ])

    const expectedErrorMessages = [
      { message: 'Unhandled Promise Rejection: Test', tested: false, meta: 'string' },
      { message: 'Unhandled Promise Rejection: 1', tested: false, meta: 'number' },
      { message: 'Unhandled Promise Rejection: {"a":1,"b":{"a":1}}', tested: false, meta: 'nested obj' },
      { message: 'Unhandled Promise Rejection: [1,2,3]', tested: false, meta: 'array' },
      { message: 'Unhandled Promise Rejection: test', tested: false, meta: 'error with message' },
      { message: 'test', tested: false, meta: 'error with no setter with message' },
      { message: 'Unhandled Promise Rejection', tested: false, meta: 'undefined' },
      { message: 'Unhandled Promise Rejection: null', tested: false, meta: 'null' },
      { message: 'Unhandled Promise Rejection: ', tested: false, meta: 'error with no message' },
      { message: 'Unhandled Promise Rejection: {}', tested: false, meta: 'map object' },
      { message: 'Unhandled Promise Rejection: {"abc":"Hello"}', tested: false, meta: 'factory function' },
      { message: 'Unhandled Promise Rejection: undefined', tested: false, meta: 'uncalled function' },
      { message: 'Unhandled Promise Rejection: {"abc":"circular"}', tested: false, meta: 'circular object' }
    ]
    assertErrorAttributes(errorQuery)
    errorBody.err.forEach(err => {
      const targetError = expectedErrorMessages.find(x => !x.tested && x.message === err.params.message)
      if (targetError) targetError.tested = true
      expect(!!targetError).toBeTruthy()
      expect(!!err.params.stack_trace).toBeTruthy()
      expect(!!err.params.stackHash).toBeTruthy()
    })
    expect(expectedErrorMessages.every(x => x.tested)).toBeTruthy()
  })

  it('should report errors from XHR callbacks', async () => {
    const pageUrl = await browser.testHandle.assetURL('xhr-error.html')
    const [[{ request: { body: errorBody, query: errorQuery } }]] = await Promise.all([
      errorsCapture.waitForResult({ totalCount: 1 }),
      browser.url(pageUrl)
        .then(() => browser.waitForAgentLoad())
    ])

    let expectedErrors = [{
      name: 'Error',
      message: 'xhr onload',
      stack: [
        { f: 'XMLHttpRequest.goodxhr', u: pageUrl, l: 9 }
      ]
    }]
    assertErrorAttributes(errorQuery)
    assertExpectedErrors(errorBody.err, expectedErrors, pageUrl)
  })
})
