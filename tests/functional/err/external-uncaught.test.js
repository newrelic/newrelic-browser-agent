/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const {assertErrorAttributes, verifyStackTraceOmits, getErrorsFromResponse} = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('reporting uncaught errors from external scripts', supported, function (t, browser, router) {
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('external-uncaught-error.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query)
    const actualErrors = getErrorsFromResponse(response, browser)
    verifyStackTraceOmits(t, actualErrors, 'secretValue')
    verifyStackTraceOmits(t, actualErrors, 'secretFragment')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
