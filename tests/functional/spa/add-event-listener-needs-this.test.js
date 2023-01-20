/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

const asserters = testDriver.asserters

let supported = testDriver.Matcher.withFeature('addEventListener')

testDriver.test('overwrite strict window.addEventListener does not break agent', supported, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.safeGet(router.assetURL('spa/overwrite-add-event-listener.html', { loader: 'spa' })).waitForFeature('loaded')

  Promise.all([rumPromise, loadPromise]).then(function () {
    return browser
      .waitFor(asserters.jsCondition('window.test.ran'))
      .waitFor(asserters.jsCondition('window.test.passed'))
      .then(() => t.ok(true, 'Correctly added an event listener'))
      .catch(fail)
  })

  function fail (err) {
    t.error(err)
    t.end()
  }
})
