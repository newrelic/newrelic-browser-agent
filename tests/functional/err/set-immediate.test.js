/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { assertErrorAttributes, assertExpectedErrors } = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('setImmediate')

testDriver.test('reporting errors from setImmediate callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('set-immediate-error.html', { init: { metrics: { enabled: false } } })

  let rumPromise = router.expectRumAndConditionAndErrors('window.setImmediateFired')
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise]).then(([{ query }]) => {
    assertErrorAttributes(t, query)

    let actualErrors = JSON.parse(query.err)
    let expectedErrors = [{
      message: 'immediate callback',
      stack: [{
        u: router.assetURL('js/set-immediate-error.js').split('?')[0],
        l: 10
      },{
        f: 'u',
        u: '<inline>',
        l: 12
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
