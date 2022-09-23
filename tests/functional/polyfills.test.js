/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')

const polyfillBrowsers = testDriver.Matcher.withFeature('polyfillsNeeded')

testDriver.test('rum is sent', polyfillBrowsers, function (t, browser, router) {
  t.plan(1)
  let loadPromise = browser.safeGet(router.assetURL('polyfill-test.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(() => {
    t.ok(1==1, 'Rum succeeded with ie11 + polyfill')
  }).catch(fail)

  function fail (err) {
    t.error(err, 'Rum failed with ie11 + polyfill')
    t.end()
  }
})
