const testDriver = require('../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')
const { failWithEndTimeout, asyncApiFns, extractWorkerSM, getMetricsFromResponse } = require('../functional/uncat-internal-help.cjs')

const fetchExt = testDriver.Matcher.withFeature('fetchExt')
const nestedWorkerSupport = testDriver.Matcher.withFeature('nestedWorkers')

const multipleApiCalls = asyncApiFns[1]

workerTypes.forEach(type => { // runs all test for classic & module workers & use the 'workers' browser-matcher for classic and the 'workersFull' for module
  const browsersWithOrWithoutModuleSupport = typeToMatcher(type)
  metricsWorkersCreateSM(type, browsersWithOrWithoutModuleSupport.and(nestedWorkerSupport))
})

// --- Tests ---
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
          } else if (!wsm.workerImplFail) {	// since this test is supposed to run inside a worker, there's no need to check if we're in a worker compat browser & version...
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
