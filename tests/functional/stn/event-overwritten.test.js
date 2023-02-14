/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('captures callbacks even when window.Event overwritten', supported, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()
  let loadPromise = browser.get(router.assetURL('click.html')).waitForFeature('loaded')

  Promise.all([rumPromise, resourcePromise, loadPromise]).then(() => {
    return router.expectResources().then(({ request: { body } }) => {
      let nodes = JSON.parse(body).res
      let ntimers = nodes.filter((n) => n.t === 'timer').length
      t.ok(ntimers >= 31, ntimers + ' timer nodes seen in session trace, want >= 31')
      t.end()
    })
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})
