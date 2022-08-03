/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const {assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse} = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('reporting errors from setTimeout callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('set-timeout-error.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  })

  let rumPromise = router.expectRumAndConditionAndErrors('window.setTimeoutFired')
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query)
    const actualErrors = getErrorsFromResponse(response, browser)
    let expectedErrors = [{
      message: 'timeout callback',
      stack: [{
        u: router.assetURL('js/set-timeout-error.js').split('?')[0],
        l: 9
      },{
        f: 'u', u: '<inline>', l: 12
      }]
    }]

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
