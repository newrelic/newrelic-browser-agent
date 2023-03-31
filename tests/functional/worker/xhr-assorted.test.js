const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')
const { fail, querypack, getXhrFromResponse } = require('../xhr/helpers')
const { testEventsRequest } = require('../../../tools/testing-server/utils/expect-tests')

workerTypes.forEach(type => {
  const browsersWithOrWithoutModuleSupport = typeToMatcher(type)
  addEventListenerPatched(type, browsersWithOrWithoutModuleSupport)
  constructorRuntimePatched(type, browsersWithOrWithoutModuleSupport)

  catCors(type, browsersWithOrWithoutModuleSupport)
  harvestRetried(type, browsersWithOrWithoutModuleSupport)

  abortCalled(type, browsersWithOrWithoutModuleSupport)
})

// --- Tests ---
function addEventListenerPatched (type, browserVersionMatcher) {
  testDriver.test(`${type} - xhr instrumentation works with EventTarget.prototype.addEventListener patched`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          ajax: { harvestTimeSeconds: 5 },
          metrics: { enabled: false }
        },
        workerCommands: [() => {
          var wrapperInvoked = false
          function wrap (callback) {
            return function () {
              var args = Array.prototype.slice.call(arguments)
              wrapperInvoked = true
              callback.apply(self, args)
            }
          }

          function patchAddEventListener (prototype) {
            if (prototype.hasOwnProperty && prototype.hasOwnProperty('addEventListener')) {
              var orig = prototype.addEventListener
              prototype.addEventListener = function (event, callback, bubble) {
                orig.call(this, event, wrap(callback), bubble)
              }
            }
          }

          var proto = XMLHttpRequest.prototype
          while (proto && !proto.hasOwnProperty('addEventListener')) {
            proto = Object.getPrototypeOf(proto)
          }
          patchAddEventListener(proto)
        }, () => {
          var xhrDone = false
          var xhr = new XMLHttpRequest()
          xhr.open('GET', '/json')
          xhr.addEventListener('load', function () { xhrDone = true })
          xhr.send()
        }].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const xhrMetricsPromise = router.expectAjaxTimeSlices()

      Promise.all([loadPromise, xhrMetricsPromise, router.expectRum()])
        .then(([, { request }]) => {
          t.ok(!!getXhrFromResponse(request), 'got XHR data')
      	t.end()
        })
        .catch(fail(t, 'unexpected problem reading payload'))
    }
  )
}
function constructorRuntimePatched (type, browserVersionMatcher) {
  testDriver.test(`${type} - xhr instrumentation works with bad XHR constructor runtime-patch`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          ajax: { harvestTimeSeconds: 5 },
          metrics: { enabled: false }
        },
        workerCommands: [() => {
          var origXHR = self.XMLHttpRequest
          self.XMLHttpRequest = function (flags) {
            return new origXHR(flags)
          }
          for (let prop in origXHR) {
            if (typeof origXHR[prop] === 'function') {
              self.XMLHttpRequest[prop] = origXHR[prop]
            }
          }
          var xhrDone = false
          var xhr = new XMLHttpRequest()
          xhr.open('GET', '/json')
          xhr.onload = function () { xhrDone = true }
          xhr.send()
        }].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const xhrMetricsPromise = router.expectAjaxTimeSlices()

      Promise.all([loadPromise, xhrMetricsPromise, router.expectRum()])
        .then(([, { request }]) => {
          t.ok(!!getXhrFromResponse(request), 'got XHR data')
      	t.end()
        })
        .catch(fail(t, 'unexpected problem reading payload'))
    }
  )
}

function catCors (type, browserVersionMatcher) {
  testDriver.test(`${type} - does not set CAT headers on outbound XHRs to different origin`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        workerCommands: [() => {
          if (!NREUM.loader_config) NREUM.loader_config = {}
          NREUM.loader_config.xpid = '12#34'
        },
				`self.testId = '${router.testId}'`,
				() => {
				  var url = 'http://' + NREUM.info.beacon + '/cat-cors/' + self.testId
				  var xhr = new XMLHttpRequest()
				  xhr.open('GET', url)
				  xhr.send()
				}].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const ajaxPromise = router.expect('bamServer', {
        test: function (request) {
          const url = new URL(request.url, 'resolve://')
          return url.pathname === `/cat-cors/${router.testId}`
        }
      })

      Promise.all([ajaxPromise, loadPromise, router.expectRum()])
        .then(([{ request }]) => {
          t.notok(request.headers['x-newrelic-id'], 'cross-origin XHR should not have CAT header')
      	t.end()
        })
        .catch(fail(t, 'unexpected error'))
    }
  )
}

function harvestRetried (type, browserVersionMatcher) {
  testDriver.test(`${type} - ajax events harvests are retried when collector returns 429`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          harvest: { tooManyRequestsDelay: 10 },
          ajax: {
            harvestTimeSeconds: 5,
            enabled: true
          },
          metrics: { enabled: false }
        },
        workerCommands: [() => {
          setTimeout(function () {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', '/json')
            xhr.send()
          }, 2000)
        }].map(x => x.toString())
      })

      router.scheduleReply('bamServer', {
        test: testEventsRequest,
        statusCode: 429
      })

      const loadPromise = browser.safeGet(assetURL)
      const ajaxPromise = router.expectAjaxEvents()
      let firstBody

      Promise.all([ajaxPromise, loadPromise, router.expectRum()])
        .then(([result]) => {
          t.equal(result.reply.statusCode, 429, 'server responded with 429')
          firstBody = querypack.decode(result.request.body)
          return router.expectAjaxEvents()
        }).then(result => {
          t.equal(router.requestCounts.bamServer.events, 2, 'got two events harvest requests')

          const secondBody = querypack.decode(result.request.body)

          const secondContainsFirst = firstBody.every(firstElement => {
            return secondBody.find(secondElement => {
              return secondElement.path === firstElement.path && secondElement.start === firstElement.start
            })
          })

          t.equal(result.reply.statusCode, 200, 'server responded with 200')
          t.ok(secondContainsFirst, 'second body should include the contents of the first retried harvest')
          t.end()
        }).catch(fail(t))
    }
  )
}

function abortCalled (type, browserVersionMatcher) {
  testDriver.test(`${type} - xhr.abort() called in load callback`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          ajax: { harvestTimeSeconds: 2 },
          metrics: { enabled: false }
        },
        workerCommands: [() => {
          var xhr = new XMLHttpRequest()
          xhr.addEventListener('load', function () {
            xhr.abort()
            self.xhrDone = true
          })
          xhr.open('GET', '/xhr_with_cat/1')
          xhr.send()
        }].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const xhrPromise = router.expectAjaxTimeSlices()

      Promise.all([xhrPromise, loadPromise, router.expectRum()])
        .then(([{ request }]) => {
          const parsedXhrs = getXhrFromResponse(request, browser)
          t.ok(parsedXhrs, 'got XHR data')
          t.ok(parsedXhrs.length >= 1, 'has at least one XHR record')
          t.ok(parsedXhrs.find(function (xhr) {
            return xhr.params && xhr.params.pathname === '/xhr_with_cat/1'
          }), 'has xhr with /xhr_with_cat/1 endpoint')
          for (const parsedXhr of parsedXhrs) {
            if (parsedXhr.params.pathname === '/xhr_with_cat/1') {
              t.equal(parsedXhr.params.method, 'GET', 'has GET method')
              t.ok(parsedXhr.params.host, 'has a hostname')
              t.equal(parsedXhr.params.status, 200, 'has status of 200')
              t.equal(parsedXhr.params.cat, 'foo', 'has CAT data for /xhr_with_cat')
              t.ok(parsedXhr.metrics, 'has metrics')
              t.equal(parsedXhr.metrics.count, 1, 'has one metric count')
              t.ok(parsedXhr.metrics.duration && parsedXhr.metrics.duration.t >= 0, 'has duration >= 0')
              t.equal(parsedXhr.metrics.rxSize && parsedXhr.metrics.rxSize.t, 409, 'has rxSize of 409')
              t.ok(parsedXhr.metrics.cbTime && parsedXhr.metrics.cbTime.t >= 0, 'has cbTime >= 0')
              t.ok(parsedXhr.metrics.time && parsedXhr.metrics.time.t >= 0, 'has time >= 0')
            }
          }
          t.end()
        }).catch(fail(t, 'unexpected error'))
    }
  )
}
