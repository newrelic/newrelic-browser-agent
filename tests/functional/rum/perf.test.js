/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('RUM perf times should not be negative', withTls, function (t, browser, router) {
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
