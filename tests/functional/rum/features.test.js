/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('rum feature flags, full loader', withTls, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', { loader: 'full' }))

  Promise.all([rumPromise, loadPromise]).then(([{ query }]) => {
    const actual = query.af.split(",")
    let expected = ['err', 'ins', 'xhr', 'stn']
    if (!browser.hasFeature('xhr')) {
      expected.pop()
      expected.pop()
    } else if (!browser.hasFeature('stn')) {
      expected.pop()
    }
    t.ok(same(actual, expected))
    t.end()
  }).catch(fail)

  function fail(err) {
    t.fail(err)
    t.end()
  }
})

testDriver.test('rum feature flags, rum loader', withTls, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', { loader: 'rum' }))

  Promise.all([rumPromise, loadPromise]).then(([{ query }]) => {
    t.equal(query.af, void 0)
    t.end()
  }).catch(fail)

  function fail(err) {
    t.fail(err)
    t.end()
  }
})

function same(actual = [], expected = []) {
  return actual.length === expected.length && actual.every(x => expected.includes(x))
}
