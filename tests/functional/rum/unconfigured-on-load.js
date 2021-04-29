/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

const asserters = testDriver.asserters

testDriver.test('RUM ', function (t, browser, router) {
  t.plan(1)

  let url = router.assetURL('unconfigured-on-load.html')

  browser.get(url)
    .waitFor(asserters.jsCondition('window.loadEventHasFired'))
    .safeEval('__nr_require("ee").backlog', function (err, backlog) {
      if (err) throw (err)
      t.notOk(backlog.api, 'ee buffer should be empty')
    })
    .catch(fail)

  browser.get(url)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
