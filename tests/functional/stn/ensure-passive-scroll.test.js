/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('ensure scroll listener is passive', supported, function (t, browser, router) {
  t.plan(1)

  let resourcePromise = router.expectResources()
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('stn/ensure-passive.html'))

  Promise.all([rumPromise, resourcePromise, loadPromise])
    .then(() => {
      return browser.safeEval('!window.failed && window.gotScroll')
    }).then((value) => {
      t.ok(value)
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('does not support session traces', supported.inverse(), function (t, browser, router) {
  t.end()
})
