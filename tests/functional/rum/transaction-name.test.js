/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('RUM transactionName', withTls, function (t, browser, router) {
  t.plan(2)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('instrumented.html', { config: { transactionName: 'abc' } }))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      t.equal(query.to, 'abc', 'has correct obfuscated transactionName')
      t.equal(query.t, undefined, 'tNamePlain excluded')
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('RUM tNamePlain', withTls, function (t, browser, router) {
  t.plan(2)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('instrumented.html', { config: { tNamePlain: 'abc' } }))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      t.equal(query.t, 'abc', 'has correct tNamePlain')
      t.equal(query.to, undefined, 'transactionName param excluded')
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('RUM transactionName and tNamePlain', withTls, function (t, browser, router) {
  t.plan(2)
  let options = { config: { transactionName: 'abc', tNamePlain: 'def' } }

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('instrumented.html', options))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      t.equal(query.to, 'abc', 'has correct obfuscated transactionName')
      t.equal(query.t, undefined, 'tNamePlain excluded')
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
