/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('addEventListener')

testDriver.test('does not send SPA interactions if flag is false', supported, function (t, browser, router) {
  t.plan(1)

  router.flags.spa = 0

  let rumPromise = router.expectRum()
  let loadPromise = browser.safeGet(router.assetURL('spa/xhr.html', { loader: 'spa' }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      router.timeout = 5000
      router.expectEvents()
        .then(() => {
          t.fail('should not get initial page load event submission')
        })
        .catch(() => {
          t.ok('did not get initial page load event submission')
        })
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
