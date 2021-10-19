/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const {getErrorsFromResponse, getCustomMetricsFromResponse} = require('./err/assertion-helpers')

let withUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('noticeError API call generates a supportabilityMetric', withUnload, function (t, browser, router) {
  t.plan(6)
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('api/custom-metrics.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var supportabilityMetrics = getCustomMetricsFromResponse(data, true)
      var customMetrics = getCustomMetricsFromResponse(data, false)
      var errorData = getErrorsFromResponse(data, browser)
      var params = errorData[0] && errorData[0]['params']
      if (params) {
        var sm = supportabilityMetrics && supportabilityMetrics[0]
        t.ok(sm && sm.params && sm.metrics, 'A supportabilityMetric was generated for noticeError')
        t.equal(sm.params.name, 'API/noticeError', 'supportabilityMetric contains correct name')
        t.equal(sm.metrics.count, 1, 'supportabilityMetric count was incremented by 1')

        var cm = customMetrics && customMetrics[0]
        t.ok(cm && cm.params && cm.metrics, 'A customMetric was generated')
        t.equal(cm.params.name, 'finished', 'customMetric contains correct name')
        t.equal(cm.metrics.count, 1, 'customMetric was only counted once')
      } else {
        fail('No error data was received.')
      }
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
