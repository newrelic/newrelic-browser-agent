const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')
const { fail } = require('../xhr/helpers')
const querypack = require('@newrelic/nr-querypack')

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
      const ajaxPromise = router.expectAjaxEvents(7000)
      const rumPromise = router.expectRum()

      Promise.all([ajaxPromise, rumPromise, loadPromise])
        .then(([{ request }]) => {
          const requests = querypack.decode(request.body)

          const xmlHttpRequest = requests.find(r => r.requestedWith === 'XMLHttpRequest' && r.path === '/json')
          t.ok(xmlHttpRequest, 'XHR is harvested')

          if (browser.hasFeature('fetch')) {
            const fetchRequest = requests.find(r => r.requestedWith === 'fetch' && r.path === '/json')
            t.ok(fetchRequest, 'fetch is harvested')
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
        router.expectAjaxEvents(7000),
        router.expectAjaxEvents(14000)
      ])
      const rumPromise = router.expectRum()

      Promise.all([ajaxPromise, rumPromise, loadPromise])
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
      const ajaxPromise = router.expectAjaxEvents(7000)
      const rumPromise = router.expectRum()

      Promise.all([ajaxPromise, rumPromise, loadPromise])
        .then(([{ request }]) => {
          const requests = querypack.decode(request.body)
            .filter(r => r.path === '/json')

          requests.forEach(r => {
            t.ok(r.guid && r.guid.length > 0, 'should be a non-empty guid string')
            t.ok(r.traceId && r.traceId.length > 0, 'should be a non-empty traceId string')
            t.ok(r.timestamp != null && r.timestamp > 0, 'should be a non-zero timestamp')
          })
          t.end()
        }).catch(fail(t))
    }
  )
}
