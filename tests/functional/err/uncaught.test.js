/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse } = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('sendBeacon')

testDriver.test('reporting uncaught errors', supported, function (t, browser, router) {
  let assetURL = router.assetURL('uncaught.html', {
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
      { message: 'original onerror', tested: false },
      { message: 'uncaught error', tested: false },
      { message: 'fake', tested: false },
      { message: 'original return false', tested: false }
    ]
    actualErrors.forEach(err => {
      const targetError = expectedErrorMessages.find(x => x.message === err.params.message)
      if (targetError) targetError.tested = true
      t.ok(!!targetError, `expected ${err.params.message} message exists`)
      t.ok(!!err.params.stack_trace, 'stack_trace exists')
      t.ok(!!err.params.stackHash, 'stackHash exists')
      // fake has different exceptionClass than the others.... so check
      if (err.params.message === 'fake') t.ok(err.params.exceptionClass !== 'Error', `fake error has correct exceptionClass (${err.params.exceptionClass})`)
      else t.ok(err.params.exceptionClass === 'Error', `error has correct exceptionClass (${err.params.exceptionClass})`)
    })
    t.ok(expectedErrorMessages.every(x => x.tested), 'All expected error messages were found')
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
