/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse } = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('sendBeacon')

testDriver.test('unhandledPromiseRejections are caught and are readable', supported, function (t, browser, router) {
  let assetURL = router.assetURL('unhandled-promise-rejection-readable.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  })

  let rumPromise = router.expectRum()
  let errorPromise = router.expectErrors()
  let loadPromise = browser.get(assetURL)

  Promise.all([errorPromise, rumPromise, loadPromise]).then(([{ request }]) => {
    assertErrorAttributes(t, request.query)
    const actualErrors = getErrorsFromResponse(request, browser)
    const expectedErrorMessages = [
      { message: 'Unhandled Promise Rejection: "Test"', tested: false, meta: 'string' },
      { message: 'Unhandled Promise Rejection: 1', tested: false, meta: 'number' },
      { message: 'Unhandled Promise Rejection: {"a":1,"b":{"a":1}}', tested: false, meta: 'nested obj' },
      { message: 'Unhandled Promise Rejection: [1,2,3]', tested: false, meta: 'array' },
      { message: 'Unhandled Promise Rejection: test', tested: false, meta: 'error with message' },
      { message: 'test', tested: false, meta: 'error with no setter with message' },
      { message: 'Unhandled Promise Rejection: ', tested: false, meta: 'undefined' },
      { message: 'Unhandled Promise Rejection: null', tested: false, meta: 'null' },
      { message: 'Unhandled Promise Rejection: ', tested: false, meta: 'error with no message' },
      { message: 'Unhandled Promise Rejection: {}', tested: false, meta: 'map object' },
      { message: 'Unhandled Promise Rejection: {"abc":"Hello"}', tested: false, meta: 'factory function' },
      { message: 'Unhandled Promise Rejection: undefined', tested: false, meta: 'uncalled function' },
      { message: 'Unhandled Promise Rejection: ', tested: false, meta: 'circular object' }
    ]
    actualErrors.forEach(err => {
      const targetError = expectedErrorMessages.find(x => !x.tested && x.message === err.params.message)
      if (targetError) targetError.tested = true
      t.ok(!!targetError, `expected ${targetError?.meta} message exists (${err.params.message})`)
      t.ok(!!err.params.stack_trace, 'stack_trace exists')
      t.ok(!!err.params.stackHash, 'stackHash exists')
    })
    t.ok(expectedErrorMessages.every(x => x.tested), 'All expected error messages were found')
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
