/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse } = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')
  .exclude('ie@8')

testDriver.test('reporting errors from XHR callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('xhr-error.html', {
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
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(assetURL).waitForConditionInBrowser('window.xhrFired')

  Promise.all([errorsPromise, rumPromise, loadPromise]).then(([{ request }]) => {
    assertErrorAttributes(t, request.query)
    const actualErrors = getErrorsFromResponse(request, browser)
    let xhrJSURL = router.assetURL('js/xhr-error.js').split('?')[0]
    let expectedErrors = [{
      name: 'Error',
      message: 'xhr onload',
      stack: [
        { f: 'XMLHttpRequest.goodxhr', u: xhrJSURL, l: 9 }
      ]
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
