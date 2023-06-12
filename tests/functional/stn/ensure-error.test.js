/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('errors get to session traces', supported, function (
  t,
  browser,
  router
) {
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()
  let loadPromise = browser.get(router.assetURL('instrumented.html', {
    init: {
      session_trace: {
        harvestTimeSeconds: 5
      }
    },
    scriptString: `
    // even though the error happens before the call to /resources,
    // it is not collected until the second cycle
    throw new Error("hello session traces i am error")
    `
  })).waitForFeature('loaded')

  Promise.all([resourcePromise, rumPromise, loadPromise])
    .then(() => {
      return router.expectResources().then(({ request: { body } }) => {
        let err = body.res.find((node) => {
          return node.n === 'error'
        })
        t.ok(err, 'Has an error')
        t.equal(err.o, 'hello session traces i am error', 'Is expected error')

        let ajax = body.res.find((node) => {
          return node.n === 'Ajax'
        })
        t.ok(ajax, 'Has an Ajax')
        t.end()
      })
    })
    .catch(fail)

  function fail (err) {
    t.error(err, `unexpected error: ${err.message}`)
    t.end()
  }
})
