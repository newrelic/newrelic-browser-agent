/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const { asyncApiFns, failWithEndTimeout, extractWorkerSM, getMetricsFromResponse } = require('./uncat-internal-help.cjs')

const withUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')
const fetchBrowsers = testDriver.Matcher.withFeature('fetchExt')

const NUM_POLYFILL_SM_FEATS = 4;  // disabled in workers
const multipleApiCalls = asyncApiFns[1]; // page should trigger 5 calls of 'setPageViewName'

// rum agent does not collect metrics
const loaderTypes = ['full', 'spa']
const loaderTypesMapped = {full: 'pro', spa: 'spa'}
loaderTypes.forEach(lt => loaderTypeSupportabilityMetric(lt))

function loaderTypeSupportabilityMetric(loaderType) {
  testDriver.test(`generic agent info is captured - ${loaderType}`, fetchBrowsers, function (t, browser, router) {
    let rumPromise = router.expectRumAndErrors()
    const loadPromise = browser.safeGet(router.assetURL('instrumented.html', {
      loader: loaderType,
      init: {
        jserrors: {
          enabled: false
        }
      }
    }))

    Promise.all([rumPromise, loadPromise])
      .then(([data]) => {
        console.log(data.body)
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

testDriver.test('Calling a newrelic[api] fn creates a supportability metric', withUnload, function (t, browser, router) {
  t.plan((asyncApiFns.length) + 6 + NUM_POLYFILL_SM_FEATS)
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

      for (const sm of supportabilityMetrics) {
        const match = asyncApiFns.find(x => x === sm.params.name);
        if (match) observedAPImetrics.push(match);

        if (sm.params.name === multipleApiCalls)
          t.equal(sm.stats.c, 5, sm.params.name + ' count was incremented by 1 until reached 5');
        else if (sm.params.name.startsWith('Workers/'))
          continue; // these metrics have an unreliable count dependent & are tested separately anyways
        else
          t.equal(sm.stats.c, 1, sm.params.name + ' count was incremented by 1');
      }

      t.ok(observedAPImetrics.length === asyncApiFns.length, 'Saw all asyncApiFns')

      t.ok(customMetrics[0].params.name === 'finished', 'a `Finished` Custom Metric (cm) was also generated')
      t.end()
    })
    .catch(failWithEndTimeout(t))
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
    .catch(failWithEndTimeout(t))
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
    .catch(failWithEndTimeout(t))
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
    .catch(failWithEndTimeout(t))
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
    .catch(failWithEndTimeout(t))
})

/**
 * When workers constructors are called, they should generate supportability metric for each instance. Environments in which (certain) workers are
 * not supported should also report a sm once per life of page.
 */
testDriver.test('workers creation generates sm', function (t, browser, router) {
  let rumPromise = router.expectRumAndErrors()
  const loadPromise = browser.safeGet(router.assetURL('instrumented-worker.html', {
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
      t.ok(supportabilityMetrics && !!supportabilityMetrics.length, `${supportabilityMetrics.length} SupportabilityMetrics object(s) were generated`);

      const wsm = extractWorkerSM(supportabilityMetrics);

      // Just assume that all the browsers & versions we test will support workers because it's been long supported; don't bother test 'Workers/All/Unavailable'.
      let workerShouldExistOnThisBrowser = testDriver.Matcher.withFeature('workers').match(browser.browserSpec);
      if (workerShouldExistOnThisBrowser && !wsm.workerImplFail) {  // worker may be avail in Chrome v4, but our SM implementation may not be supported until v60, etc.
        t.ok(wsm.classicWorker, 'classic worker is expected and used');

        /* Also note that though Firefox & older Safari don't actually support module workers, their call to the constructor still succeeds hence
          generating a false positive sm. For simplicity, we'll just accept it as-is, so there's no add'l check here for 'workersFull' match. 
          ... Actually, if you compare Safari v14 vs. Edge v79, in both of which module workers are n/a, only the latter errors out while the former silently ignores. */
        t.ok(wsm.moduleWorker, 'module worker is expected and used');
      }

      // Shared & Service workers below are more niche.
      workerShouldExistOnThisBrowser = testDriver.Matcher.withFeature('sharedWorkers').match(browser.browserSpec);
      if (workerShouldExistOnThisBrowser && !wsm.sharedImplFail) {
        t.ok(wsm.classicShared, 'classic sharedworker is expected and used');
        t.ok(wsm.moduleShared, 'module sharedworker is expected and used');
      } else {
        t.ok(wsm.sharedUnavail || wsm.sharedImplFail, 'sharedworker API or SM should be unavailable on this browser version');
      }

      // Service Workers won't be available in tests until JIL local asset server runs on HTTPS or changes to localhost/127.#.#.# url
      workerShouldExistOnThisBrowser = testDriver.Matcher.withFeature('serviceWorkers').match(browser.browserSpec);
      if (workerShouldExistOnThisBrowser) {
        t.notOk(wsm.classicService || wsm.moduleService, 'classic or module serviceworker is NOT expected or used');
        t.ok(wsm.serviceUnavail || wsm.serviceImplFail, 'serviceworker API should be unavailable on all');
      }

      t.end()
    })
    .catch(failWithEndTimeout(t))
})