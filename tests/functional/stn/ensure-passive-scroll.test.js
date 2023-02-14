/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

const stn = testDriver.Matcher.withFeature('stn')
const supported = testDriver.Matcher.withFeature('passiveSupported')

testDriver.test('ensure scroll listener IS passive if supported', stn.and(supported), function (t, browser, router) {
  t.plan(1)

  let resourcePromise = router.expectResources()
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('stn/ensure-passive.html')).waitForFeature('loaded')

  Promise.all([rumPromise, resourcePromise, loadPromise])
    .then(() => {
      return browser.safeEval('window.isPassive && window.gotScroll')
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

testDriver.test('ensure scroll listener IS NOT passive if not supported', stn.and(supported.inverse()), function (t, browser, router) {
  t.plan(1)

  let resourcePromise = router.expectResources()
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('stn/ensure-passive.html')).waitForFeature('loaded')

  Promise.all([rumPromise, resourcePromise, loadPromise])
    .then(() => {
      return browser.safeEval('!window.isPassive && window.gotScroll')
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
