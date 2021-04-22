/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import testDriver from '../../../tools/jil/index.es6'

var supported = testDriver.Matcher.withFeature('reliableUnloadEvent')
  .exclude('ie@<9') // need XMLHttpRequest.prototype.addEventListener for XHR instrumentation
let sendBeaconBrowsers = testDriver.Matcher.withFeature('workingSendBeacon')

testDriver.test('xhr instrumentation works with bad XHR constructor monkey-patch', supported, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRumAndConditionAndErrors('window.xhrDone')
  let loadPromise = browser.get(router.assetURL('xhr-constructor-monkey-patched.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise]).then(([{query, body}]) => {
    if (sendBeaconBrowsers.match(browser)) {
      t.ok(JSON.parse(body).xhr, 'got XHR data')
    } else {
      t.ok(query.xhr, 'got XHR data')
    }
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})
