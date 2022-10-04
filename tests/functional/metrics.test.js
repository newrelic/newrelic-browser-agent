/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const { getErrorsFromResponse, getMetricsFromResponse } = require('./err/assertion-helpers')

const withUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')
const fetchBrowsers = testDriver.Matcher.withFeature('fetchExt')
const NUM_POLYFILL_SM_FEATS = 4;

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

function fail(t, err) {
  return (err) => {
    t.error(err);
    setTimeout(() => {
      t.end()
    }, 8000);
  };
}

testDriver.test('Calling a newrelic[api] fn creates a supportability metric', withUnload, function (t, browser, router) {
  t.plan((asyncApiFns.length) + 5 + NUM_POLYFILL_SM_FEATS)
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
    .catch(fail(t))
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
    .catch(fail(t))
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
    .catch(fail(t))
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
    .catch(fail(t))
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
    .catch(fail(t))
})

/**
 * When workers constructors are called, they should generate supportability metric for each instance. Environments in which (certain) workers are
 * not supported should also report a sm once per life of page.
 */
testDriver.test('workers creation generates sm', fetchBrowsers, function (t, browser, router) {
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
      let classicWorker = moduleWorker = classicShared = moduleShared = classicService = moduleService = false;
      let sharedUnavail = serviceUnavail = false;
      let workerImplFail = sharedImplFail = serviceImplFail = false;

      // Comb through for specific worker SM tags we want to see.
      for (const sm of supportabilityMetrics) {
        switch (sm.params.name) {
          case 'Workers/Dedicated/Classic':
            classicWorker = true; break;
          case 'Workers/Dedicated/Module':
            moduleWorker = true; break;
          case 'Workers/Dedicated/SM/Unsupported':
            workerImplFail = true; break;
          case 'Workers/Shared/Classic':
            classicShared = true; break;
          case 'Workers/Shared/Module':
            moduleShared = true; break;
          case 'Workers/Shared/SM/Unsupported':
            sharedImplFail = true; break;
          case 'Workers/Shared/Unavailable':
            sharedUnavail = true; break;
          case 'Workers/Service/Classic':
            classicService = true; break;
          case 'Workers/Service/Module':
            moduleService = true; break;
          case 'Workers/Service/SM/Unsupported':
            serviceImplFail = true; break;
          case 'Workers/Service/Unavailable':
            serviceUnavail = true; break;
        }
      }

      // Just assume that all the browsers & versions we test will support workers because it's been long supported; don't bother test 'Workers/All/Unavailable'.
      let workerShouldExistOnThisBrowser = testDriver.Matcher.withFeature('workers').match(browser.browserSpec);
      if (workerShouldExistOnThisBrowser && !workerImplFail) {  // worker may be avail in Chrome v4, but our SM implementation may not be supported until v60, etc.
        t.ok(classicWorker, 'classic worker is expected and used');
        t.ok(moduleWorker, 'module worker is expected and used');
      }

      // Shared & Service workers below are more niche.
      workerShouldExistOnThisBrowser = testDriver.Matcher.withFeature('sharedWorkers').match(browser.browserSpec);
      if (workerShouldExistOnThisBrowser && !sharedImplFail) {
        t.ok(classicShared, 'classic sharedworker is expected and used');
        t.ok(moduleShared, 'module sharedworker is expected and used');
      } else {
        t.ok(sharedUnavail || sharedImplFail, 'sharedworker API or SM should be unavailable on this browser version');
      }

      // Service Workers won't be available in tests until JIL local asset server runs on HTTPS or changes to localhost/127.#.#.# url
      t.notOk(classicService || moduleService, 'classic or module serviceworker is NOT expected or used');
      t.ok(serviceUnavail, 'serviceworker API should be unavailable on all');

      t.end()
    })
    .catch(fail(t));
})