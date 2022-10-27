/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { getErrorsFromResponse } = require('../err/assertion-helpers')
const {workerTypes, typeToMatcher} = require('./helpers')

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

workerTypes.forEach(type => {
  circularTest(type, typeToMatcher(type))
})

function circularTest(type, matcher) {
  testDriver.test(`${type} - a circular reference error generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        `() => {
          var ouroboros = {}
          ouroboros.ouroboros = ouroboros
          var e = new Error('asdf'); 
          e.message = ouroboros;
          throw e
        }`
      ]
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([response]) => {
      const actualErrors = getErrorsFromResponse(response, browser)

      t.equal(actualErrors.length, 1, 'exactly one error')

      let actualError = actualErrors[0]
      t.equal(actualError.params.message, expectedErrorForBrowser(browser), 'has the expected message')
      t.end()
    }).catch(fail)

    function fail(err) {
      t.error(err)
      t.end()
    }
  })
}

function expectedErrorForBrowser(browser) {
  if (browser.match('ie@<11')) {
    return 'asdf'
  } else if (browser.match('firefox@<35')) {
    return 'Error'
  } else if (browser.match('chrome, firefox@>=35, ie@11, android@>=4.4, safari@>=10, edge, ios')) {
    return '[object Object]'
  } else if (browser.match('android')) {
    return 'Uncaught Error: [object Object]'
  } else {
    return 'Error: [object Object]'
  }
}