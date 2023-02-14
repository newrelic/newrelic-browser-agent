/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { assertErrorAttributes, verifyStackTraceOmits, getErrorsFromResponse } = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('reporting uncaught errors from inline scripts', supported, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(router.assetURL('inline-uncaught-error.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  }))

  Promise.all([errorsPromise, rumPromise, loadPromise]).then(([{ request }]) => {
    assertErrorAttributes(t, request.query)
    const actualErrors = getErrorsFromResponse(request, browser)
    verifyStackTraceOmits(t, actualErrors, 'secretValue')
    verifyStackTraceOmits(t, actualErrors, 'secretFragment')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
