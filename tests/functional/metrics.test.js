/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const { getErrorsFromResponse, getMetricsFromResponse } = require('./err/assertion-helpers')

let withUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')
const fetchBrowsers = testDriver.Matcher.withFeature('fetchExt')

const smLabel = (fn) => `API/${fn}/called`

const asyncApiFns = [
  'noticeError',
  'setPageViewName',
  'setCustomAttribute',
  'setErrorHandler',
  'finished',
  'addToTrace',
  'addRelease'
].map(smLabel)

const multipleApiCalls = smLabel('setPageViewName') // page should trigger 5 calls of this fn

testDriver.test('Calling a newrelic[api] fn creates a supportability metric', withUnload, function (t, browser, router) {
  t.plan((asyncApiFns.length) + 5)
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('api/customMetrics.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      jserrors: {
        enabled: false
      }
    }
  }))

  const observedAPImetrics = []

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      var customMetrics = getMetricsFromResponse(data, false)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      t.ok(customMetrics && !!customMetrics.length, 'CustomMetrics object(s) were generated')

      supportabilityMetrics.forEach(sm => {
        const match = asyncApiFns.find(x => x === sm.params.name)
        if (match) observedAPImetrics.push(match)
        if (sm.params.name === multipleApiCalls) t.equal(sm.stats.c, 5, sm.params.name + ' count was incremented by 1 until reached 5')
        else t.equal(sm.stats.c, 1, sm.params.name + ' count was incremented by 1')
      })

      t.ok(observedAPImetrics.length === asyncApiFns.length, 'Saw all asyncApiFns')

      t.ok(customMetrics[0].params.name === 'finished', 'a `Finished` Custom Metric (cm) was also generated')
      t.end()
    })
    .catch(fail)

  function fail(err) {
    t.error(err)
    setTimeout(() => {
      t.end()
    }, 8000)
  }
})

testDriver.test('a valid obfuscationRule creates detected supportability metric', fetchBrowsers, function (t, browser, router) {
  let rumPromise = router.expectRumAndErrors()
  const loadPromise = browser.safeGet(router.assetURL('obfuscate-pii-valid.html', {
    loader: 'spa',
    init: {
      jserrors: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      supportabilityMetrics.forEach(sm => {
        t.ok(!sm.params.name.includes('Generic/Obfuscate/Invalid'), sm.params.name + ' contains correct name')
      })
      t.end()
    })
    .catch(fail)

  function fail(err) {
    t.error(err)
    setTimeout(() => {
      t.end()
    }, 8000)
  }
})

testDriver.test('an invalid obfuscation regex type creates invalid supportability metric', fetchBrowsers, function (t, browser, router) {
  let rumPromise = router.expectRumAndErrors()
  const loadPromise = browser.safeGet(router.assetURL('obfuscate-pii-invalid-regex-type.html', {
    loader: 'spa',
    init: {
      jserrors: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      let invalidDetected = false
      supportabilityMetrics.forEach(sm => {
        if (sm.params.name.includes('Generic/Obfuscate/Invalid')) invalidDetected = true
      })

      t.ok(invalidDetected, 'invalid regex rule detected')
      t.end()
    })
    .catch(fail)

  function fail(err) {
    t.error(err)
    setTimeout(() => {
      t.end()
    }, 8000)
  }
})

testDriver.test('an invalid obfuscation regex undefined creates invalid supportability metric', fetchBrowsers, function (t, browser, router) {
  let rumPromise = router.expectRumAndErrors()
  const loadPromise = browser.safeGet(router.assetURL('obfuscate-pii-invalid-regex-undefined.html', {
    loader: 'spa',
    init: {
      jserrors: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      let invalidDetected = false
      supportabilityMetrics.forEach(sm => {
        if (sm.params.name.includes('Generic/Obfuscate/Invalid')) invalidDetected = true
      })

      t.ok(invalidDetected, 'invalid regex rule detected')
      t.end()
    })
    .catch(fail)

  function fail(err) {
    t.error(err)
    setTimeout(() => {
      t.end()
    }, 8000)
  }
})

testDriver.test('an invalid obfuscation replacement type creates invalid supportability metric', fetchBrowsers, function (t, browser, router) {
  let rumPromise = router.expectRumAndErrors()
  const loadPromise = browser.safeGet(router.assetURL('obfuscate-pii-invalid-replacement-type.html', {
    loader: 'spa',
    init: {
      jserrors: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      let invalidDetected = false
      supportabilityMetrics.forEach(sm => {
        if (sm.params.name.includes('Generic/Obfuscate/Invalid')) invalidDetected = true
      })

      t.ok(invalidDetected, 'invalid regex rule detected')
      t.end()
    })
    .catch(fail)

  function fail(err) {
    t.error(err)
    setTimeout(() => {
      t.end()
    }, 8000)
  }
})
