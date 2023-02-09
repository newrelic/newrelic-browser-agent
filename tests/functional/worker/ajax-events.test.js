const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')
const { fail, condition } = require('../xhr/helpers')

const supportsFetch = testDriver.Matcher.withFeature('fetch')

workerTypes.forEach(type => {
  const browsersWithOrWithoutModuleSupport = typeToMatcher(type)
  ajaxEventsEnabled(type, browsersWithOrWithoutModuleSupport)
  ajaxEventsPayload(type, browsersWithOrWithoutModuleSupport)
  ajaxDTInfo(type, browsersWithOrWithoutModuleSupport)
})

// --- Tests ---
function ajaxEventsEnabled (type, browserVersionMatcher) {
  testDriver.test(`${type} - capturing XHR and fetch ajax events`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          ajax: {
            harvestTimeSeconds: 5,
            enabled: true
          }
        },
        workerCommands: [() => {
          setTimeout(function () {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', '/json')
            xhr.send()
            try {
              fetch('/json')
            } finally {}
          }, 2000)
        }].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const ajaxPromise = router.expectSpecificEvents({ condition })

      Promise.all([ajaxPromise, loadPromise])
        .then(([response]) => {
          if (response.length == 2) {
            t.ok('XMLHttpRequest & fetch events were harvested')
          } else {		// one of these should fail, unless browser only supports XHR not fetch
            t.equal(response[0].requestedWith, 'XMLHttpRequest', 'XHR is harvested')
            if (browser.match(supportsFetch)) {
              t.equal(response[0].requestedWith, 'fetch', 'fetch is harvested')
            }
          }
      	t.end()
        }).catch(fail(t))
    }
  )
}
function ajaxEventsPayload (type, browserVersionMatcher) {
  testDriver.test(`${type} - capturing large payload of XHR ajax events`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          ajax: {
            harvestTimeSeconds: 5,
        		maxPayloadSize: 500,
            enabled: true
          }
        },
        workerCommands: [() => {
          var count = 0
          function sendHello () {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', '/json')
            xhr.setRequestHeader('Content-Type', 'text/plain')
            xhr.onload = function (e) {
              if (count < 50) {
                count++
                sendHello()
              }
            }
            xhr.send()
          }
          setTimeout(sendHello, 2000)
        }].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const ajaxPromise = Promise.all([
        router.expectSpecificEvents({ condition }),
        router.expectSpecificEvents({ condition })
      ])

      Promise.all([ajaxPromise, loadPromise])
        .then(([responses]) => {
          t.ok(responses)
      	t.end()
        }).catch(fail(t))
    }
  )
}
function ajaxDTInfo (type, browserVersionMatcher) {
  testDriver.test(`${type} - Distributed Tracing info is added to XHR & fetch ajax events`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        injectUpdatedLoaderConfig: true,
        config: {
          accountID: '1234',
          agentID: '1',
          trustKey: '1'
        },
        init: {
          distributed_tracing: { enabled: true },
          ajax: {
            harvestTimeSeconds: 2,
            enabled: true
          }
        },
        workerCommands: [() => {
          setTimeout(function () {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', '/json')
            xhr.send()
            try {
              fetch('/json')
            } finally {}
          }, 2000)
        }].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const ajaxPromise = router.expectSpecificEvents({ condition })

      Promise.all([ajaxPromise, loadPromise])
        .then(([response]) => {
          if (response.length == 2) {
            t.ok('XMLHttpRequest & fetch events were harvested')
          } else {		// one of these should fail, unless browser only supports XHR not fetch
            t.equal(response[0].requestedWith, 'XMLHttpRequest', 'XHR is harvested')
            if (browser.match(supportsFetch)) {
              t.equal(response[0].requestedWith, 'fetch', 'fetch is harvested')
            }
          }
          response.forEach(r => {
            t.ok(r.guid && r.guid.length > 0, 'should be a non-empty guid string')
            t.ok(r.traceId && r.traceId.length > 0, 'should be a non-empty traceId string')
            t.ok(r.timestamp != null && r.timestamp > 0, 'should be a non-zero timestamp')
          })
          t.end()
        }).catch(fail(t))
    }
  )
}
