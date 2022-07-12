/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../../tools/jil/index')
const { assertErrorAttributes, assertExpectedErrors, verifyStackTraceOmits, getErrorsFromResponse } = require('./assertion-helpers')

const supported = testDriver.Matcher.withFeature('latestSmoke')

const opts = {
  init: {
    jserrors: {
      harvestTimeSeconds: 2
    }
  }
}

testDriver.test('Error objects are sent via noticeError from core module', supported, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.safeGet(router.assetURL('modular/js-errors/error-obj.html', opts))
  let errorsPromise = router.expectErrors()

  Promise.all([loadPromise, errorsPromise])
    .then(([loadResult, errorsResult]) => {
      var errorData = getErrorsFromResponse(errorsResult)
      var params = errorData[0] && errorData[0]['params']

      if (params) {
        var exceptionClass = params.exceptionClass
        var message = params.message
        t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string.')
        t.equal('hello', message, 'Params contain the right error message.')
        t.end()
      } else {
        fail('No error data was received.')
      }
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('Strings are converted to errors via noticeError from core module', supported, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.safeGet(router.assetURL('modular/js-errors/string.html', opts))
  let errorsPromise = router.expectErrors()

  Promise.all([loadPromise, errorsPromise])
    .then(([loadResult, errorsResult]) => {
      var errorData = getErrorsFromResponse(errorsResult)
      var params = errorData[0] && errorData[0]['params']

      if (params) {
        var exceptionClass = params.exceptionClass
        var message = params.message
        t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string.')
        t.equal('hello', message, 'Params contain the right error message.')
        t.end()
      } else {
        fail('No error data was received.')
      }
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('Error objects with custom attributes can be sent via noticeError from core module', supported, function (t, browser, router) {
  t.plan(3)

  let loadPromise = browser.safeGet(router.assetURL('modular/js-errors/custom-attributes.html', opts))
  let errorsPromise = router.expectErrors()

  Promise.all([loadPromise, errorsPromise])
    .then(([loadResult, errorsResult]) => {
      var errorData = getErrorsFromResponse(errorsResult)
      var params = errorData[0] && errorData[0]['params']
      var custom = errorData[0] && errorData[0]['custom']

      if (!params) return fail('No error data was received.')
      if (!custom) return fail('No custom params were detected')


      var exceptionClass = params.exceptionClass
      var message = params.message
      t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string.')
      t.equal('hello', message, 'Params contain the right error message.')
      t.equal('hi', custom.customAttr, 'Error has custom metric')
      t.end()

    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('Errors are sent from multiple instances to isolated targets via noticeError', supported, function (t, browser, router) {
  t.plan(4)

  let loadPromise = browser.safeGet(router.assetURL('modular/js-errors/multiple-instances.html', opts))
  let nr1Promise = router.expectErrors(1)
  let nr2Promise = router.expectErrors(2)

  Promise.all([loadPromise, nr1Promise, nr2Promise])
    .then(([loadResult, ...errorsResult]) => {
      errorsResult.forEach(errorResult => {
        var errorData = getErrorsFromResponse(errorResult)
        var params = errorData[0] && errorData[0]['params']

        if (params) {
          var exceptionClass = params.exceptionClass
          var message = params.message
          t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string.')
          t.equal('agent' + errorResult.query.a, message, 'Params contain the right error message.')

        } else {
          fail('No error data was received.')
        }
      })
      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('Error objects are sent via thrown error from core module if auto is enabled', supported, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.safeGet(router.assetURL('modular/js-errors/auto.html', opts))
  let errorsPromise = router.expectErrors()

  Promise.all([loadPromise, errorsPromise])
    .then(([loadResult, errorsResult]) => {
      var errorData = getErrorsFromResponse(errorsResult)
      var params = errorData[0] && errorData[0]['params']

      if (params) {
        var exceptionClass = params.exceptionClass
        var message = params.message
        t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string.')
        t.equal('hello', message, 'Params contain the right error message.')
        t.end()
      } else {
        fail('No error data was received.')
      }
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})


testDriver.test('encoding error where message contains a circular reference', supported, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.get(router.assetURL('modular/js-errors/circular.html', opts))
  let errorsPromise = router.expectErrors()

  Promise.all([loadPromise, errorsPromise]).then(([loadResult, errorsResult]) => {
    var errorData = getErrorsFromResponse(errorsResult)

    t.equal(errorData.length, 1, 'exactly one error')

    let actualError = errorData[0]
    t.equal(actualError.params.message, expectedErrorForBrowser(browser), 'has the expected message')
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }

  function expectedErrorForBrowser(browser) {
    if (browser.match('ie@<11, edge')) {
      return 'asdf'
    } else if (browser.match('firefox@<35')) {
      return 'Error'
    } else if (browser.match('chrome, firefox@>=35, ie@11, android@>=4.4, safari@>=10, ios@>12')) {
      return '[object Object]'
    } else if (browser.match('android')) {
      return 'Uncaught Error: [object Object]'
    } else {
      return 'Error: [object Object]'
    }
  }
})

testDriver.test('reporting errors from event listener callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('modular/js-errors/event-listener.html', opts)

  let loadPromise = browser.get(assetURL)
  let errorsPromise = router.expectErrors()

  Promise.all([errorsPromise, loadPromise]).then(([errorsResponse]) => {
    assertErrorAttributes(t, errorsResponse.query)
    const actualErrors = getErrorsFromResponse(errorsResponse)
    let eventListenersURL = router.assetURL('js/event-listener-error.js').split('?')[0]

    let expectedErrors = [
      {
        message: 'document addEventListener listener',
        stack: [
          {f: 'Object.handleEvent', u: eventListenersURL, l: 15},
          {f: 'e', u: '<inline>', l: 11}
        ]
      },
      {
        message: 'global addEventListener listener',
        stack: [
          {f: 'handleEvent', u: eventListenersURL, l: 8},
          {f: 'e', u: '<inline>', l: 9}
        ]
      }
    ]

    // No function name from earlier IEs
    if (browser.match('ie@<10, safari@<7')) {
      delete expectedErrors[0].stack[0].f
      delete expectedErrors[1].stack[0].f
      expectedErrors[0].stack.splice(1, 1)
      expectedErrors[1].stack.splice(1, 1)
    }

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('reporting uncaught errors from external scripts', supported, function (t, browser, router) {
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(router.assetURL('modular/js-errors/external-uncaught-error.html', opts))

  Promise.all([errorsPromise, loadPromise]).then(([errorsResponse]) => {
    assertErrorAttributes(t, errorsResponse.query)
    const actualErrors = getErrorsFromResponse(errorsResponse)
    verifyStackTraceOmits(t, actualErrors, 'secretValue')
    verifyStackTraceOmits(t, actualErrors, 'secretFragment')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('reporting uncaught errors from inline scripts', supported, function (t, browser, router) {
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(router.assetURL('modular/js-errors/inline-uncaught-error.html', opts))

  Promise.all([errorsPromise, loadPromise]).then(([errorsResponse]) => {
    assertErrorAttributes(t, errorsResponse.query)
    const actualErrors = getErrorsFromResponse(errorsResponse)
    verifyStackTraceOmits(t, actualErrors, 'secretValue')
    verifyStackTraceOmits(t, actualErrors, 'secretFragment')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})


testDriver.test('reporting errors from setInterval callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('modular/js-errors/set-interval-error.html', opts)

  // let rumPromise = router.expectRumAndConditionAndErrors('window.intervalFired')
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(assetURL)

  Promise.all([errorsPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query)
    const actualErrors = getErrorsFromResponse(response)
    t.ok(browser.safeEval('window.intervalFired'), 'window.intervalFired')
    let expectedErrors = [{
      message: 'interval callback',
      stack: [{
        u: router.assetURL('js/set-interval-error.js').split('?')[0],
        l: 10
      }]
    }]

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})


testDriver.test('reporting errors from setTimeout callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('modular/js-errors/set-timeout-error.html', opts)

  // let rumPromise = router.expectRumAndConditionAndErrors('window.setTimeoutFired')
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(assetURL)

  Promise.all([errorsPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query)
    const actualErrors = getErrorsFromResponse(response, browser)
    t.ok(browser.safeEval('window.setTimeoutFired', 'window.setTimeoutFired'))
    let expectedErrors = [{
      message: 'timeout callback',
      stack: [{
        u: router.assetURL('js/set-timeout-error.js').split('?')[0],
        l: 9
      }]
    }]

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})


testDriver.test('reporting errors from XHR callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('modular/js-errors/xhr-error.html', opts)

  // let rumPromise = router.expectRumAndConditionAndErrors('window.xhrFired')
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(assetURL)

  Promise.all([errorsPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query)
    const actualErrors = getErrorsFromResponse(response, browser)
    t.ok(browser.safeEval('window.xhrFired', 'window.xhrFired'))
    let xhrJSURL = router.assetURL('js/xhr-error.js').split('?')[0]
    let expectedErrors = [{
      message: 'xhr onload',
      stack: [{ f: 'goodxhr', u: xhrJSURL, l: 9 }]
    }]

    if (browser.match('ie@<10, safari@<7, firefox@<15')) {
      delete expectedErrors[0].stack[0].f
    }

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})



testDriver.test('Errors are not sent if agent is not initialized', supported, function (t, browser, router) {
  setRouterTimeout(5000)
  t.plan(1)

  let loadPromise = browser.setAsyncScriptTimeout(5000).safeGet(router.assetURL('modular/js-errors/invalid-not-initialized.html', opts))
  let errorsPromise = router.expectErrors()

  Promise.all([loadPromise, errorsPromise])
    .then(([response]) => {
      t.error()
      t.end()
    })
    .catch(fail)
    .finally(() => setRouterTimeout(32000))

  function fail() {
    t.ok(true, 'Errors Promise did not execute because agent was not initialized')
    t.end()
  }

  function setRouterTimeout(ms) {
    router.timeout = router.router.timeout = ms
  }
})


testDriver.test('Errors are not sent if feature is disabled', supported, function (t, browser, router) {
  setRouterTimeout(5000)
  t.plan(1)

  let loadPromise = browser.setAsyncScriptTimeout(5000).safeGet(router.assetURL('modular/js-errors/disabled.html', opts))
  let errorsPromise = router.expectErrors()

  Promise.all([loadPromise, errorsPromise])
    .then(([response]) => {
      t.error()
      t.end()
    })
    .catch(fail)
    .finally(() => setRouterTimeout(32000))

  function fail() {
    t.ok(true, 'Errors Promise did not execute because errors feature was disabled')
    t.end()
  }

  function setRouterTimeout(ms) {
    router.timeout = router.router.timeout = ms
  }
})

