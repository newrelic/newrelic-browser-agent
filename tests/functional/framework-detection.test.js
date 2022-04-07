/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const {getMetricsFromResponse} = require('./err/assertion-helpers')

let frameworks = testDriver.Matcher.withFeature('frameworks')

testDriver.test('Agent detects a page built with REACT and sends a supportability metric', frameworks, function (t, browser, router) {
  t.plan(2)
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('frameworks/react/simple-app/index.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length && supportabilityMetrics.length === 1, 'SupportabilityMetrics object was generated')
      const sm = supportabilityMetrics[0]
      t.equals(sm.params.name, 'Framework/React/Detected', 'Supportability metric is React and is formatted correctly')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    setTimeout(() => {
      t.end()
    }, 8000)
  }
})

testDriver.test('Agent detects a page built with ANGULAR and sends a supportability metric', frameworks, function (t, browser, router) {
  t.plan(2)
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('frameworks/angular/simple-app/index.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length && supportabilityMetrics.length === 1, 'SupportabilityMetrics object was generated')
      const sm = supportabilityMetrics[0]
      t.equals(sm.params.name, 'Framework/Angular/Detected', 'Supportability metric is Angular and is formatted correctly')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    setTimeout(() => {
      t.end()
    }, 8000)
  }
})

testDriver.test('Agent detects a page built with NO FRAMEWORK and DOES NOT send a supportability metric', frameworks, function (t, browser, router) {
  t.plan(1)
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('frameworks/control.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(!supportabilityMetrics, 'FRAMEWORK SupportabilityMetrics object(s) were NOT generated')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    setTimeout(() => {
      t.end()
    }, 8000)
  }
})
