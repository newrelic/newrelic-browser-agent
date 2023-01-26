/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('rum with multiple load events', withTls, function (t, browser, router) {
  t.plan(2)

  let config = { applicationTime: 12 }

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-multiple-load-events.html', {config}))

  Promise.all([rumPromise, loadPromise]).then(() => {
    t.ok(true, 'got first RUM submission')
  }).catch(fail)

  router.expectRum(10000).then(() => {
    t.fail('should not get second RUM request even when window load event fires again')
  }).catch(() => {
    t.ok(true, 'did not get second RUM request')
  })

  function fail (err) {
    t.fail(err)
    t.end()
  }
})
