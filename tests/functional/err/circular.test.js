/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { getErrorsFromResponse } = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('encoding error where message contains a circular reference', supported, function (t, browser, router) {
  t.plan(2)

  let rumPromise = router.expectRum()
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(router.assetURL('circular.html', {
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
    const actualErrors = getErrorsFromResponse(request, browser)

    t.equal(actualErrors.length, 1, 'exactly one error')

    let actualError = actualErrors[0]
    t.equal(actualError.params.message, expectedErrorForBrowser(browser), 'has the expected message')
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

function expectedErrorForBrowser (browser) {
  if (browser.match('ie@<11')) {
    return 'asdf'
  } else if (browser.match('firefox@<35')) {
    return 'Error'
  } else if (browser.match('chrome, firefox@>=35, ie@11, android@>=4.4, safari@>=10, edge')) {
    return '[object Object]'
  } else if (browser.match('android')) {
    return 'Uncaught Error: [object Object]'
  } else {
    return 'Error: [object Object]'
  }
}
