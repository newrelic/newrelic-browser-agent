/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import testDriver from '../../../tools/jil/index.es6'

let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('RUM backend time', withTls, function (t, browser, router) {
  t.plan(1)

  let url = router.assetURL('instrumented.html')

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(url)

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      return Promise.all([router.expectRum(), browser.get(url)])
    })
    .then(([{query}]) => {
      if (browser.match('opera')) {
        t.skip('Opera does not support before unload, so no be time')
      } else if (browser.match('ie@<9')) {
        // IE 6 & 7 sometimes report a backend time of 0, and we don't know why.
        t.ok(+query.be >= 0, 'Backend time of ' + query.be + ' >= 0')
      } else {
        t.ok(+query.be > 0, 'Backend time of ' + query.be + ' > 0')
      }
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
