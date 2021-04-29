/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

testDriver.test('RUM double instrumetation', function (t, browser, router) {
  t.plan(1)

  browser
    .get(router.assetURL('double-instrumented.html'))
    // Count is the number of times a 'load' listener was added.
    .safeEval('count', function (err, count) {
      if (err) t.fail(err)
      t.equal(count, 1, 'load event listener added exactly once')
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
