/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('posts session traces', supported, function (t, browser, router) {
  t.plan(5)

  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()
  let loadPromise = browser.get(router.assetURL('lotsatimers.html')).waitForFeature('loaded')

  Promise.all([resourcePromise, rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    t.ok(+query.st > 1408126770885, `Got start time ${query.st}`)
    t.notok(query.ptid, 'No ptid on first harvest')
    t.equal(query.ja, '{"aargh":"somanytimers"}', 'custom javascript attributes (on stn first post)')
    return router.expectResources().then(({ request: { query } }) => {
      t.ok(query.ptid, `ptid on second harvest ${query.ptid}`)
      t.equal(query.ja, undefined, 'no javascript attributes (on stn second post)')
      t.end()
    })
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})
