/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('jil')
const {assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse} = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')
const init = {
    page_view_timing: {
        enabled: false
    },
    metrics: {
        enabled: false
    },
    jserrors: {
        enabled: true,
        harvestTimeSeconds: 5
    }
}

testDriver.test('NR-40043: Multiple errors with noticeError and unique messages should not bucket', supported, function (t, browser, router) {
    const assetURL = router.assetURL('js-errors-noticeerror-bucketing.html', { loader: 'full', init })
    const rumPromise = router.expectRum()
    const loadPromise = browser.get(assetURL)
    const errPromise = router.expectErrors()

    Promise.all([errPromise, rumPromise, loadPromise]).then(([errors]) => {
        assertErrorAttributes(t, errors.query, 'has errors')

        const actualErrors = getErrorsFromResponse(errors, browser)

        let expectedErrors = [...Array(8)].map((_, i) => ({
            name: 'Error',
            message: `Error message ${i + 1}`,
            stack: [{
                u: '<inline>',
                l: 36,
                c: 31
            }, {
                u: '<inline>',
                l: 35,
                c: 33
            }]
        }));

        assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
        t.end()
    }).catch(fail)

    function fail (err) {
        t.error(err)
        t.end()
    }
})

testDriver.test('NEWRELIC-3788: Multiple identical errors from the same line but different columns should not be bucketed', supported, function (t, browser, router) {
  const assetURL = router.assetURL('js-errors-column-bucketing.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const errPromise = router.expectErrors()

  Promise.all([errPromise, rumPromise, loadPromise]).then(([errors]) => {
    assertErrorAttributes(t, errors.query, 'has errors')

    const actualErrors = getErrorsFromResponse(errors, browser)
    t.ok(actualErrors.length === 2, "two errors reported")
    t.ok(typeof actualErrors[1].stack_trace === "string", "second error has stack trace")

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
