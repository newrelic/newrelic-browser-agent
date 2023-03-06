/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { fail, getErrorsFromResponse } = require('../err/assertion-helpers')
const { getXhrFromResponse } = require('../xhr/helpers')
const { workerTypes, typeToMatcher } = require('./helpers')

const supportsFetch = testDriver.Matcher.withFeature('fetch')
const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

workerTypes.forEach(type => {
  const browsersWithOrWithoutModuleSupport = typeToMatcher(type)
  xhrErrorTest(type, browsersWithOrWithoutModuleSupport)

  submissionXhr(type, browsersWithOrWithoutModuleSupport)
  submissionFetch(type, browsersWithOrWithoutModuleSupport.and(supportsFetch))
})

// --- Tests ---
function xhrErrorTest (type, matcher) {
  testDriver.test(`${type} - an error in xhr callback is noticed and harvested`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => {
          var xhrload = new XMLHttpRequest()
          xhrload.onload = function goodxhr () {
            throw new Error('xhr onload')
          }
          xhrload.open('GET', '/bogus')
          xhrload.send()
        }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request }]) => {
      const actualErrors = getErrorsFromResponse(request, browser)

      t.equal(actualErrors.length, 1, 'exactly one error')

      let actualError = actualErrors[0]
      t.equal(actualError.metrics.count, 1, 'Should have seen 1 error')
      t.ok(actualError.metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(actualError.params.exceptionClass, 'Error', 'Should be Error class')
      t.equal(actualError.params.message, 'xhr onload', 'Should have correct message')
      t.ok(actualError.params.stack_trace, 'Should have a stack trace')
      t.end()
    }).catch(fail(t))
  })
}

function submissionXhr (type, browserVersionMatcher) {
  testDriver.test(`${type} - capturing XHR metrics`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init,
        workerCommands: [() => {
          var xhr = new XMLHttpRequest()
          xhr.open('GET', '/json')
          xhr.onload = function () { self.xhrDone = true }
          xhr.send()
        }].map(x => x.toString())
      })

      const loadPromise = browser.get(assetURL)
      const xhrPromise = router.expectAjaxTimeSlices()

      Promise.all([xhrPromise, loadPromise])
        .then(([response]) => {
          t.equal(response.request.method, 'POST', 'XHR data submitted via POST request from sendBeacon')
          t.ok(response.request.body, 'request body should not be empty')

          const parsedXhrs = getXhrFromResponse(response.request, browser)
          t.ok(parsedXhrs, 'has xhr data')
          t.ok(parsedXhrs.length >= 1, 'has at least one XHR record')
          t.deepEqual(['metrics', 'params'], Object.keys(parsedXhrs[0]).sort(), 'XHR record has correct keys')
          t.end()
        }).catch(fail(t))
    }
  )
}
function submissionFetch (type, browserVersionMatcher) {
  testDriver.test(`${type} - capturing fetch metrics`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init,
        workerCommands: ['fetch(\'/json\')']
      })

      const loadPromise = browser.get(assetURL)
      const xhrPromise = router.expectAjaxTimeSlices()

      Promise.all([xhrPromise, loadPromise])
        .then(([response]) => {
          t.equal(response.request.method, 'POST', 'XHR data submitted via POST request from sendBeacon')
          t.ok(response.request.body, 'request body should not be empty')

          const parsedXhrs = getXhrFromResponse(response.request, browser)
          var fetchData = parsedXhrs.find(xhr => xhr.params.pathname === '/json')
          t.ok(fetchData, 'has xhr data')
          t.deepEqual(['metrics', 'params'], Object.keys(fetchData).sort(), 'XHR record has correct keys')
          t.end()
        }).catch(fail(t))
    }
  )
}
