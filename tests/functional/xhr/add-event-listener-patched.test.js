/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { fail } = require('./helpers')

const supported = testDriver.Matcher.withFeature('reliableUnloadEvent')
const sendBeaconBrowsers = testDriver.Matcher.withFeature('workingSendBeacon')

testDriver.test(
  'xhr instrumentation works with EventTarget.prototype.addEventListener patched',
  supported,
  function (t, browser, router) {
    t.plan(1)

    let rumPromise = router.expectRumAndCondition('window.xhrDone && window.wrapperInvoked')
    let xhrMetricsPromise = router.expectXHRMetrics()
    let loadPromise = browser.get(
      router.assetURL('xhr-add-event-listener-patched.html', {
        init: {
          page_view_timing: {
            enabled: false
          },
          metrics: {
            enabled: false
          }
        }
      })
    )

    Promise.all([xhrMetricsPromise, rumPromise, loadPromise])
      .then(([{ query, body }]) => {
        if (sendBeaconBrowsers.match(browser)) {
          t.ok(JSON.parse(body).xhr, 'got XHR data')
        } else {
          t.ok(query.xhr, 'got XHR data')
        }
      })
      .catch(fail(t, 'unexpected error'))
  }
)
