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
  let loadPromise = browser.get(router.assetURL('sessiontraceerror.html')).waitForFeature('loaded')

  Promise.all([resourcePromise, rumPromise, loadPromise])
    .then(() => {
      return router.expectResources().then(({ request: { body } }) => {
        let parsed = JSON.parse(body)

        let err = parsed.res.find((node) => {
          return node.n === 'error'
        })
        t.ok(err, 'Has an error')
        t.equal(err.o, 'hello session traces i am error')

        let ajax = parsed.res.find((node) => {
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
