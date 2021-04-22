/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import testDriver from '../../../tools/jil/index.es6'
let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('RUM global count, full loader', withTls, function (t, browser, router) {
  runGlobalCountTest(t, browser, router, 'full')
})

testDriver.test('RUM global count, dev loader', withTls, function (t, browser, router) {
  runGlobalCountTest(t, browser, router, 'dev')
})

function runGlobalCountTest (t, browser, router, loader) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('global-count.html', { loader }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.safeEval('window.added.length', function (err, added) {
        if (err) console.error(err)
        if (typeof added !== 'number') return t.fail('Global variable test failed')
        if (browser.match('ie@<9')) {
          t.equal(added, 0, `Added ${added} mangled vars`)
        } else {
          t.equal(added, 3, `Added ${added} globals`)
        }
      })
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
}
