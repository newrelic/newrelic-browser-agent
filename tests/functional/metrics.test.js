/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const { asyncApiFns, failWithEndTimeout, extractWorkerSM, getMetricsFromResponse } = require('./uncat-internal-help.cjs')

const withUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')
const fetchBrowsers = testDriver.Matcher.withFeature('fetchExt')

const multipleApiCalls = asyncApiFns[1] // page should trigger 5 calls of 'setPageViewName'

const loaderTypes = ['rum', 'full', 'spa']
const loaderTypesMapped = { rum: 'lite', full: 'pro', spa: 'spa' }
loaderTypes.forEach(lt => loaderTypeSupportabilityMetric(lt))

function loaderTypeSupportabilityMetric (loaderType) {
  testDriver.test(`generic agent info is captured - ${loaderType}`, fetchBrowsers, function (t, browser, router) {
    let rumPromise = router.expectRum()
    const loadPromise = browser.safeGet(router.assetURL('instrumented.html', { loader: loaderType }))

    Promise.all([rumPromise, loadPromise])
      .then(() => {
        browser.get(router.assetURL('/'))
        return router.expectMetrics(3000)
      })
      .then(({ request: data }) => {
        var supportabilityMetrics = getMetricsFromResponse(data, true)
        const loaderTypeSM = supportabilityMetrics.find(x => x.params.name.includes('LoaderType'))
        t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
        t.ok(!!loaderTypeSM, `LoaderType was captured for ${loaderType}`)
        t.ok(loaderTypeSM.params.name.includes(loaderTypesMapped[loaderType]), `LoaderType SM matches ${loaderType}`)
        t.end()
      })
      .catch(failWithEndTimeout(t))
  })
}

testDriver.test('agent tracks resources seen', withUnload, function (t, browser, router) {
  let metricsPromise = router.expectSupportMetrics()
  const loadPromise = browser.safeGet(router.assetURL('resources.html', {
    init: { page_view_event: { enabled: false } }
  }))

  Promise.all([loadPromise])
    .then(() => Promise.all([
      metricsPromise,
      browser.get(router.assetURL('resources.html')) // to conserve network traffic while trying to capture everything, resources SM harvest happens when page unloads
    ]))
    .then(([{ request: data }]) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      const nonAjaxInternal = supportabilityMetrics.find(x => x.params.name.includes('Resources/Non-Ajax/Internal'))
      const nonAjaxExternal = supportabilityMetrics.find(x => x.params.name.includes('Resources/Non-Ajax/External'))
      const ajaxInternal = supportabilityMetrics.find(x => x.params.name.includes('Resources/Ajax/Internal'))
      const ajaxExternal = supportabilityMetrics.find(x => x.params.name.includes('Resources/Ajax/External'))

      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      t.ok(!!nonAjaxInternal, 'Non-Ajax External was captured')
      t.ok(!!nonAjaxExternal, 'Non-Ajax Internal was captured')
      t.ok(!!ajaxInternal, 'Ajax External was captured')
      t.ok(!!ajaxExternal, 'Ajax Internal was captured')

      // depending on when metrics agg gets imported, this can be slightly different values.  Just test that its positive
      t.ok(nonAjaxInternal.stats.c > 0, 'Non-Ajax External has a value')
      t.ok(nonAjaxExternal.stats.c >= 2, 'Non-Ajax Internal has the correct value')
      t.ok(ajaxInternal.stats.c >= 2, 'Ajax Internal has the correct value')
      t.ok(ajaxExternal.stats.c > 0, 'Ajax External has the correct value')
      t.end()
    })
    .catch(failWithEndTimeout(t))
})

testDriver.test('Calling a newrelic[api] fn creates a supportability metric', withUnload, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/customMetrics.html'))

  const observedAPImetrics = []

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.get(router.assetURL('/'))
      return router.expectMetrics(3000)
    })
    .then(({ request: data }) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true).filter(sm => sm.params.name.toLowerCase().includes('api'))
      var customMetrics = getMetricsFromResponse(data, false)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      t.ok(customMetrics && !!customMetrics.length, 'CustomMetrics object(s) were generated')

      for (const sm of supportabilityMetrics) {
        const match = asyncApiFns.find(x => x === sm.params.name)
        if (match) observedAPImetrics.push(match)

        if (sm.params.name === multipleApiCalls) { t.equal(sm.stats.c, 5, sm.params.name + ' count was incremented by 1 until reached 5') }
        else if (sm.params.name.startsWith('Workers/')) { continue } // these metrics have an unreliable count dependent & are tested separately anyways
        else { t.equal(sm.stats.c, 1, sm.params.name + ' count was incremented by 1') }
      }

      t.ok(observedAPImetrics.length === asyncApiFns.length, 'Saw all asyncApiFns')

      t.ok(customMetrics[0].params.name === 'finished', 'a `Finished` Custom Metric (cm) was also generated')
      t.end()
    })
    .catch(failWithEndTimeout(t))
})

testDriver.test('a valid obfuscationRule creates detected supportability metric', fetchBrowsers, function (t, browser, router) {
  let rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('obfuscate-pii-valid.html', { loader: 'spa' }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.get(router.assetURL('/'))
      return router.expectMetrics(3000)
    })
    .then(({ request: data }) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      supportabilityMetrics.forEach(sm => {
        t.ok(!sm.params.name.includes('Generic/Obfuscate/Invalid'), sm.params.name + ' contains correct name')
      })
      t.end()
    })
    .catch(failWithEndTimeout(t))
})

testDriver.test('an invalid obfuscation regex type creates invalid supportability metric', fetchBrowsers, function (t, browser, router) {
  let rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('obfuscate-pii-invalid-regex-type.html', { loader: 'spa' }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.get(router.assetURL('/'))
      return router.expectMetrics(3000)
    })
    .then(({ request: data }) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      let invalidDetected = false
      supportabilityMetrics.forEach(sm => {
        if (sm.params.name.includes('Generic/Obfuscate/Invalid')) invalidDetected = true
      })

      t.ok(invalidDetected, 'invalid regex rule detected')
      t.end()
    })
    .catch(failWithEndTimeout(t))
})

testDriver.test('an invalid obfuscation regex undefined creates invalid supportability metric', fetchBrowsers, function (t, browser, router) {
  let rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('obfuscate-pii-invalid-regex-undefined.html', { loader: 'spa' }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.get(router.assetURL('/'))
      return router.expectMetrics(3000)
    })
    .then(({ request: data }) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      let invalidDetected = false
      supportabilityMetrics.forEach(sm => {
        if (sm.params.name.includes('Generic/Obfuscate/Invalid')) invalidDetected = true
      })

      t.ok(invalidDetected, 'invalid regex rule detected')
      t.end()
    })
    .catch(failWithEndTimeout(t))
})

testDriver.test('an invalid obfuscation replacement type creates invalid supportability metric', fetchBrowsers, function (t, browser, router) {
  let rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('obfuscate-pii-invalid-replacement-type.html', { loader: 'spa' }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.get(router.assetURL('/'))
      return router.expectMetrics(3000)
    })
    .then(({ request: data }) => {
      var supportabilityMetrics = getMetricsFromResponse(data, true)
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
      let invalidDetected = false
      supportabilityMetrics.forEach(sm => {
        if (sm.params.name.includes('Generic/Obfuscate/Invalid')) invalidDetected = true
      })

      t.ok(invalidDetected, 'invalid regex rule detected')
      t.end()
    })
    .catch(failWithEndTimeout(t))
})
