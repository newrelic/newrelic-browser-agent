/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import testDriver from '../../../tools/jil/index.es6'
import {assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse} from './assertion-helpers.es6'

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('ignoring errors works', supported, function (t, browser, router) {
  let assetURL = router.assetURL('ignored-error.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  })

  let rumPromise = router.expectRumAndConditionAndErrors('window.errorsThrown')
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query, 'has errors')

    const actualErrors = getErrorsFromResponse(response, browser)

    let expectedErrors = [{
      message: 'report',
      stack: [{
        u: '<inline>',
        l: 20
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
