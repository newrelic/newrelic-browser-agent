/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('RUM no body', withTls, function (t, browser, router) {
  t.plan(2)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('no-body.html', { config: { account: 'test_account' } }))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      t.equal(query.ac, 'test_account', 'Reported without body element')
      t.equal(query.ja, '{"no":"body"}', 'Confirmed no body element')
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
