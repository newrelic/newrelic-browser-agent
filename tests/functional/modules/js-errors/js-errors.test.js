/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../../tools/jil/index')
const { getErrorsFromResponse } = require('../../err/assertion-helpers')

var es6 = testDriver.Matcher.withFeature('es6')

testDriver.test('Valid Errors are sent via storeError from scoped module', es6, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.safeGet(router.assetURL('modular/send-scoped-noticeerror.html'))
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

      t.ok()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('Error sent via noticeError from scoped module', es6, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.safeGet(router.assetURL('modular/send-scoped-noticeerror.html'))
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

      t.ok()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})
