/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

const BrowserMatcher = testDriver.Matcher
// Safari 15 in sauce labs behaves inconsistently with this for unknown reasons atm
// The behavior was validated manually in SL via a live browser, but disabling to preserve
// test suite resiliency for now.
// this behavior is happening on several tests and a future effort will be conducted to
// identify why safari@15 via SL is inconsistent.
let withNavTiming = testDriver.Matcher.withFeature('navTiming').and(new BrowserMatcher().exclude('safari', '<=15'))

testDriver.test('RUM perf times should not be negative', withNavTiming, function (t, browser, router) {
  let url = router.assetURL('instrumented.html')

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(url)

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      return Promise.all([router.expectRum(), browser.get(url)])
    })
    .then(([{ request: { query } }]) => {
      const perf = JSON.parse(query.perf)
      t.ok(perf.timing && perf.navigation, 'perf object exists')
      t.ok(Object.values(perf.timing).every(x => x >= 0), 'All perf values are positive')
      t.end()
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
