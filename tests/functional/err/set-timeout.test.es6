/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import testDriver from '../../../tools/jil/index.es6'
import {assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse} from './assertion-helpers.es6'

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('reporting errors from setTimeout callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('set-timeout-error.html', {
    init: {
      page_view_timing: {
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
        l: 4
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
