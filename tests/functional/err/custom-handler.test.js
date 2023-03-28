/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { fail, assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse } = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('setErrorHandler ignores errors', supported, function (t, browser, router) {
  let assetURL = router.assetURL('ignored-error.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      },
      jserrors: {
        harvestTimeSeconds: 2
      }
    }
  })

  let rumPromise = router.expectRum()
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(assetURL).waitForConditionInBrowser('window.errorsThrown')

  Promise.all([errorsPromise, rumPromise, loadPromise]).then(([{ request }]) => {
    assertErrorAttributes(t, request.query, 'has errors')

    const actualErrors = getErrorsFromResponse(request)

    let expectedErrors = [{
      name: 'Error',
      message: 'report',
      stack: [{
        u: '<inline>',
        l: 23
      }]
    }]

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail(t))
})

testDriver.test('custom fingerprinting labels errors correctly', supported, function (t, browser, router) {
  let assetURL = router.assetURL('instrumented.html', {
    init: {
      metrics: {
        enabled: false
      },
      jserrors: {
        harvestTimeSeconds: 2
      }
    },
    scriptString: `
    newrelic.setErrorHandler(err => {
      switch (err.message) {
        case "much":
        case "wow":
          return {group:"doge"}
        case "meh":
          return {group:""}
        case "such":
          return false
        default:
          return true
      }
    })
    newrelic.noticeError("much")
    newrelic.noticeError("such")
    newrelic.noticeError("meh")
    newrelic.noticeError("wow")
    newrelic.noticeError("boop")
    `
  })
  let loadPromise = browser.get(assetURL)
  let rumPromise = router.expectRum()
  let errorsPromise = router.expectErrors(5000)

  Promise.all([errorsPromise, loadPromise, rumPromise]).then(([{ request }]) => {
    const actualErrors = getErrorsFromResponse(request)
    t.equal(actualErrors.length, 3, 'correct number of errors harvested')

    const expectedMsgToGroup = {
      much: 'doge',
      such: undefined,
      wow: 'doge'
    }
    actualErrors.forEach(({ params }) => {
      t.ok(params.message in expectedMsgToGroup, 'harvested error is expected')
      t.equal(params.errorGroup, expectedMsgToGroup[params.message], `"${params.message}" error has the right group label`)
    })

    t.end()
  }).catch(fail(t))
})
