/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('RUM backend time', withTls, function (t, browser, router) {
  t.plan(1)

  let url = router.assetURL('instrumented.html')

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(url)

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      console.log('rumPromise, loadPromise')
      return Promise.all([router.expectRum(), browser.get(url)])
    })
    .then(([{ request: { query } }]) => {
      console.log('rumPromise, loadPromise 2')
      t.ok(+query.be > 0, 'Backend time of ' + query.be + ' > 0')
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
