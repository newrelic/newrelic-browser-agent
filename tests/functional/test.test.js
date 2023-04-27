/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const { fail } = require('./uncat-internal-help.cjs')
const notIE = testDriver.Matcher.withFeature('notInternetExplorer')

testDriver.test('customTransactionName 1 arg', notIE, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request }]) => {
      t.equal(
        request.query.ct,
        'http://custom.transaction/foo',
        'Custom Transaction Name (1 arg)'
      )

      t.end()
    })
    .catch(fail(t))
})
