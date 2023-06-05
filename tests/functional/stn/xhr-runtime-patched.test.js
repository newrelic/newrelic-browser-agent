/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('posts session traces when xhr is runtime patched', supported, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()
  let loadPromise = browser.get(router.assetURL('instrumented.html', {
    init: {
      privacy: { cookies_enabled: false }
    },
    scriptString: `
    const orig = window.XMLHttpRequest.prototype.open
    window.XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
      orig.call(this, method, url, async, user, pass)
    }`
  })).waitForFeature('loaded')

  Promise.all([resourcePromise, rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    t.ok(+query.st > 1408126770885, `Got start time ${query.st}`)
    t.notok(query.ptid, 'No ptid on first harvest')
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})
