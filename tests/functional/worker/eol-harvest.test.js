const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')
const { fail } = require('../uncat-internal-help.cjs')

const withFetch = testDriver.Matcher.withFeature('fetch')

workerTypes.forEach(type => { // runs all test for classic & module workers & use the 'workers' browser-matcher for classic and the 'workersFull' for module
  const browsersWithOrWithoutModuleSupport = typeToMatcher(type)
  finalHarvest(type, browsersWithOrWithoutModuleSupport.and(withFetch))
})

// --- Tests ---
function finalHarvest (type, browserVersionMatcher) {
  testDriver.test(`${type} - buffered events are sent at end-of-life aka worker closing`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          ajax: { harvestTimeSeconds: 81 },
          jserrors: { harvestTimeSeconds: 81 },
          ins: { harvestTimeSeconds: 81 }
        },
        workerCommands: [() => {
          newrelic.noticeError('test')
          newrelic.addPageAction('blahblahblah')
          fetch('/json')
          setTimeout(() => self.close(), 1000)
        }].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const metrPromise = router.expectMetrics()
      const errPromise = router.expectErrors()		// CAUTION: the order of metrics (sm) and jserrors matters; metrics are always sent out FIRST
      const ajaxPromise = router.expectAjaxEvents()
      const insPromise = router.expectIns()

      Promise.all([loadPromise, metrPromise, errPromise, ajaxPromise, insPromise, router.expectRum()])
        .then(([, metrResponse, errResponse, ajaxResponse, insResponse]) => {
          let body

          body = JSON.parse(metrResponse.request.body)
          t.ok(body.sm, 'supportability metrics are sent on close')
          t.ok(body.sm.length >= 2, 'metrics included api calls as expected')
          t.equal(metrResponse.request.method, 'POST', 'metrics(-jserror) harvest is a POST')

          body = JSON.parse(errResponse.request.body)
          t.ok(body.err, 'jserrors are sent on close')
          t.equal(body.err.length, 1, 'should have 1 error obj')
          t.equal(body.err[0].params.message, 'test', 'should have correct message')
          t.equal(errResponse.request.method, 'POST', 'jserrors harvest is a POST')

          body = ajaxResponse.request.body
          t.ok(body.startsWith('bel.'), 'ajax event is sent on close')	// note: there's a race condition between api calls & final harvest callbacks that determines what the payload may look like
          t.equal(errResponse.request.method, 'POST', 'events harvest is a POST')

          body = JSON.parse(insResponse.request.body)
          t.ok(body.ins, 'page actions are sent on close')
          t.equal(body.ins.length, 1, 'should have 1 action obj')
          t.equal(body.ins[0].actionName, 'blahblahblah', 'should have correct actionName')
          t.equal(insResponse.request.method, 'POST', 'ins harvest is a POST')

      	t.end()
        })
        .catch(fail(t))
    }
  )
}
