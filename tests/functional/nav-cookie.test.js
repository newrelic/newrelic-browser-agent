/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')

testDriver.test('agent set nav cookie when page is unloading', function (t, browser, router) {
  let url = router.assetURL('final-harvest.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  })

  let loadPromise = browser.safeGet(url).waitForFeature('loaded')
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.requestCounts.bamServer.ins, undefined, 'no ins harvest yet')

      let insPromise = router.expectIns()

      let loadPromise = browser
        .safeEval('newrelic.addPageAction("hello", { a: 1 })')
        .get(router.assetURL('/'))

      return Promise.all([insPromise, loadPromise])
    })
    .then(([{ request: { body, query } }]) => {
      t.equal(router.requestCounts.bamServer.ins, 1, 'received one ins harvest')

      if (body) {
        t.ok(JSON.parse(body).ins, 'received ins harvest')
      } else {
        t.ok(query.ins, 'received ins harvest')
      }
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
