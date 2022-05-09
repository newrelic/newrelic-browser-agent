/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../../tools/jil/index')
const { getErrorsFromResponse } = require('../../err/assertion-helpers')

const es6 = testDriver.Matcher.withFeature('es6')

const opts = {
  init: {
    jserrors: {
      harvestTimeSeconds: 2
    }
  }
}

testDriver.test('Error objects are sent via noticeError from core module', es6, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.safeGet(router.assetURL('modular/send-core-noticeerror-error-obj.html', opts))
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

testDriver.test('Strings are converted to errors via noticeError from core module', es6, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.safeGet(router.assetURL('modular/send-core-noticeerror-string.html', opts))
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

testDriver.test('Errors are sent from multiple instances to isolated targets via noticeError', es6, function (t, browser, router) {
  t.plan(4)

  let loadPromise = browser.safeGet(router.assetURL('modular/send-core-noticeerror-multiple-instances.html', opts))
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

testDriver.test('Error objects are sent via thrown error from core module if auto is enabled', es6, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.safeGet(router.assetURL('modular/send-core-noticeerror-auto.html', opts))
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

testDriver.test('Errors are not sent if agent is not initialized', es6, function (t, browser, router) {
  setRouterTimeout(5000)
  t.plan(1)

  let loadPromise = browser.setAsyncScriptTimeout(5000).safeGet(router.assetURL('modular/send-core-noticeerror-invalid-not-initialized.html', opts))
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

testDriver.test('Errors are not sent if feature is disabled', es6, function (t, browser, router) {
  setRouterTimeout(5000)
  t.plan(1)

  let loadPromise = browser.setAsyncScriptTimeout(5000).safeGet(router.assetURL('modular/send-core-noticeerror-disabled.html', opts))
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

