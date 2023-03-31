/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('posts session traces', supported, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()
  let loadPromise = browser.get(router.assetURL('lotsatimers.html')).waitForFeature('loaded')

  Promise.all([resourcePromise, rumPromise, loadPromise]).then(([{ request: { body } }]) => {
    const stnBody = JSON.parse(body).res
    t.ok(stnBody.every(x => x.s >= 0 && x.e >= 0), 'stn body contains no negative timings')
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})
