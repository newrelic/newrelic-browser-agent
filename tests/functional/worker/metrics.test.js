const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')
const { failWithEndTimeout, asyncApiFns, extractWorkerSM, getMetricsFromResponse } = require('../uncat-internal-help.cjs')

const fetchExt = testDriver.Matcher.withFeature('fetchExt')
const nestedWorkerSupport = testDriver.Matcher.withFeature('nestedWorkers')

const multipleApiCalls = asyncApiFns[1]

workerTypes.forEach(type => { // runs all test for classic & module workers & use the 'workers' browser-matcher for classic and the 'workersFull' for module
  const browsersWithOrWithoutModuleSupport = typeToMatcher(type)
  metricsApiCreatesSM(type, browsersWithOrWithoutModuleSupport)
  metricsValidObfuscationCreatesSM(type, browsersWithOrWithoutModuleSupport.and(fetchExt))
  metricsInvalidObfuscationCreatesSM(type, browsersWithOrWithoutModuleSupport.and(fetchExt))
  metricsWorkersCreateSM(type, browsersWithOrWithoutModuleSupport.and(nestedWorkerSupport))
})

// --- Tests ---
function metricsApiCreatesSM (type, browserVersionMatcher) {
  testDriver.test(`${type} - Calling a newrelic[api] fn creates a supportability metric`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          jserrors: { enabled: false }
        },
        workerCommands: [() => {
          newrelic.noticeError('too many free taco coupons')
          newrelic.setPageViewName('test')
          newrelic.setCustomAttribute('test')
          newrelic.setErrorHandler()
          newrelic.finished()
          newrelic.addToTrace('test')
          newrelic.addRelease('test')

          newrelic.setPageViewName('test')
          newrelic.setPageViewName('test')
          newrelic.setPageViewName('test')
          newrelic.setPageViewName('test')
          self.close()
        }].map(x => x.toString())
      })
      const loadPromise = browser.get(assetURL)
      const metricsPromise = router.expectMetrics(5000)
      const observedAPImetrics = []

      Promise.all([metricsPromise, loadPromise])
        .then(([{ request: data }]) => {
          var supportabilityMetrics = getMetricsFromResponse(data, true).filter(sm => sm.params.name.toLowerCase().includes('api'))
          var customMetrics = getMetricsFromResponse(data, false)
          t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
          t.ok(customMetrics && !!customMetrics.length, 'CustomMetrics object(s) were generated')

          for (const sm of supportabilityMetrics) {
            const match = asyncApiFns.find(x => x === sm.params.name)
            if (match) observedAPImetrics.push(match)

            if (sm.params.name === multipleApiCalls)
            { t.equal(sm.stats.c, 5, sm.params.name + ' count was incremented by 1 until reached 5') }
            else if (sm.params.name.startsWith('Workers/'))
            { continue } // these metrics have an unreliable count dependent & are tested separately anyways
            else
            { t.equal(sm.stats.c, 1, sm.params.name + ' count was incremented by 1') }
          }

          t.ok(observedAPImetrics.length === asyncApiFns.length, 'Saw all asyncApiFns')

          t.ok(customMetrics[0].params.name === 'finished', 'a `Finished` Custom Metric (cm) was also generated')
          t.end()
        }).catch(failWithEndTimeout(t))
    }
  )
}
function metricsValidObfuscationCreatesSM (type, browserVersionMatcher) {
  testDriver.test(`${type} - a valid obfuscationRule creates detected supportability metric`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          obfuscate: [{
            regex: /pii/g,
            replacement: 'OBFUSCATED'
          }],
          ajax: { harvestTimeSeconds: 2 },
          jserrors: { enabled: false },
          ins: { harvestTimeSeconds: 2 }
        },
        workerCommands: [() => {
          setTimeout(function () {
            setTimeout(() => self.close(), 100)
            fetch('/tests/assets/obfuscate-pii-valid.html')
            throw new Error('pii')
          }, 100)
          newrelic.addPageAction('pageactionpii')
          newrelic.setCustomAttribute('piicustomAttribute', 'customAttribute')
        }].map(x => x.toString())
      })
      const loadPromise = browser.get(assetURL)
      const metricsPromise = router.expectMetrics(5000)

      Promise.all([metricsPromise, loadPromise])
        .then(([{ request: data }]) => {
          const supportabilityMetrics = getMetricsFromResponse(data, true)
          t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
          supportabilityMetrics.forEach(sm => {
            t.ok(!sm.params.name.includes('Generic/Obfuscate/Invalid'), sm.params.name + ' contains correct name')
          })
          t.end()
        }).catch(failWithEndTimeout(t))
    }
  )
}
function metricsInvalidObfuscationCreatesSM (type, browserVersionMatcher) {
  const badObfusRulesArr = [{
    regex: 123,
    replacement: 'invalid;type'		// #1 - invalid regex object
  }, {
    replacement: 'invalid,undefined'	// #2 - regex undefined
  }, {
    regex: /backslash/g,
    replacement: 123			// #3 - invalid replacement type (string)
  }]

  for (badRuleNum in badObfusRulesArr)
  { testDriver.test(`${type} - invalid obfuscation rule #${parseInt(badRuleNum) + 1} creates invalid supportability metric`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          obfuscate: [badObfusRulesArr[badRuleNum]],
          ajax: { harvestTimeSeconds: 2 },
          jserrors: { enabled: false },
          ins: { harvestTimeSeconds: 2 }
        },
        workerCommands: [() => {
          setTimeout(function () {
            setTimeout(() => self.close(), 100)
            fetch('/tests/assets/obfuscate-pii-valid.html')
            throw new Error('pii')
          }, 100)
          newrelic.addPageAction('pageactionpii')
          newrelic.setCustomAttribute('piicustomAttribute', 'customAttribute')
        }].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const metricsPromise = router.expectMetrics(5000)

      Promise.all([metricsPromise, loadPromise, router.expectRum()])
        .then(([{ request: data }]) => {
          const supportabilityMetrics = getMetricsFromResponse(data, true)
          t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
          let invalidDetected = false
          supportabilityMetrics.forEach(sm => {
            if (sm.params.name.includes('Generic/Obfuscate/Invalid')) invalidDetected = true
          })
          t.ok(invalidDetected, 'an invalid regex rule detected')
          t.end()
        }).catch(failWithEndTimeout(t))
    }
  ) }
}
function metricsWorkersCreateSM (type, browserVersionMatcher) {
  testDriver.test(`${type} - workers creation generates sm`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          jserrors: { enabled: false }
        },
        workerCommands: [() => {
          try {
            let worker1 = new Worker('./worker-scripts/simple.js')
            let worker2 = new Worker('./worker-scripts/simple.js', { type: 'module' })
          } catch (e) {
            console.warn(e)
          }
          try {
            let worker1 = new SharedWorker('./worker-scripts/simple.js')
            let worker2 = new SharedWorker('./worker-scripts/simple.js', { type: 'module' })
          } catch (e) {
            console.warn(e)
          }
          try {
            let worker1 = self.navigator.serviceWorker.register('./worker-scripts/simple.js') // This script will probably cause an error
            let worker2 = self.navigator.serviceWorker.register('./worker-scripts/simple.js', { type: 'module' })
          } catch (e) {
            console.warn(e)
          }
          self.close()
        }].map(x => x.toString())
      })
      const loadPromise = browser.get(assetURL)
      const metricsPromise = router.expectMetrics(5000)

      Promise.all([metricsPromise, loadPromise])
        .then(([data]) => {
          const supportabilityMetrics = getMetricsFromResponse(data.request, true)
          t.ok(supportabilityMetrics && !!supportabilityMetrics.length, `${supportabilityMetrics.length} SupportabilityMetrics object(s) were generated`)

          const wsm = extractWorkerSM(supportabilityMetrics)

          if (type == workerTypes[2]) {		// for shared workers, nested workers aren't avail like it is for reg workers
            t.notOk(wsm.classicWorker || wsm.moduleWorker, 'nested classic or module (dedicated) worker is not avail')
          }
          else if (!wsm.workerImplFail) {	// since this test is supposed to run inside a worker, there's no need to check if we're in a worker compat browser & version...
            t.ok(wsm.classicWorker, 'nested classic worker is available')
            t.ok(wsm.moduleWorker, 'nested module worker is available')	// see note on this from original metrics.test.js test
          }

          // The sharedWorker class is actually n/a inside of workers...
          t.notOk(wsm.classicShared || wsm.moduleShared, 'nested classic or module sharedworker is not avail')
          t.notOk(wsm.sharedUnavail || wsm.sharedImplFail, 'sharedworker supportability should not be emitted by or within a worker')

          // Don't think the serviceWorker class is or will be available inside of workers either...
          t.notOk(wsm.classicService || wsm.moduleService, 'nested classic or module serviceworker is not avail')
          t.notOk(wsm.serviceUnavail || wsm.serviceImplFail, 'serviceworker supportability should not be emitted by or within a worker')

          t.end()
        }).catch(failWithEndTimeout(t))
    }
  )
}
