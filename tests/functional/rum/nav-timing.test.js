/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

var supported = testDriver.Matcher.withFeature('navTiming')
let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('RUM navTiming', supported, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      try {
        let timing = JSON.parse(query.perf).timing
        t.ok(typeof timing.le === 'number', 'navTiming')
      } catch (e) {
        t.fail('Failed to get navTiming: ' + e.message + ', query.perf = ' + query.perf + ', query = ' + query)
      }
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('RUM navTiming unsupported', supported.inverse().and(withTls), function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      t.notok(query.perf, 'No navTiming')
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
