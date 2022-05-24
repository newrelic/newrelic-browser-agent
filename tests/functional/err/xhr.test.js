/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const {assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse} = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')
  .exclude('ie@8')
  .exclude('phantom')

testDriver.test('reporting errors from XHR callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('xhr-error.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  })

  let rumPromise = router.expectRumAndConditionAndErrors('window.xhrFired')
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query)
    const actualErrors = getErrorsFromResponse(response, browser)
    let xhrJSURL = router.assetURL('js/xhr-error.js').split('?')[0]
    let expectedErrors = [{
      message: 'xhr onload',
      stack: [{f: 'goodxhr', u: xhrJSURL, l: 9}]
    }]

    if (browser.match('ie@<10, safari@<7, firefox@<15')) {
      delete expectedErrors[0].stack[0].f
    }

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
