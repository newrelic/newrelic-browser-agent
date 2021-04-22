/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import testDriver from '../../../tools/jil/index.es6'

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('posts session traces when xhr is monkey patched', supported, function (t, browser, router) {
  t.plan(2)

  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()
  let loadPromise = browser.get(router.assetURL('xhr-monkey-patched.html'))

  Promise.all([resourcePromise, rumPromise, loadPromise]).then(([{query}]) => {
    t.ok(+query.st > 1408126770885, `Got start time ${query.st}`)
    t.notok(query.ptid, 'No ptid on first harvest')
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})
