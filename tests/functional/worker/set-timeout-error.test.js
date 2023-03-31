/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { getErrorsFromResponse } = require('../err/assertion-helpers')
const { workerTypes, typeToMatcher } = require('./helpers')

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

workerTypes.forEach(type => {
  setTimeoutErrorTest(type, typeToMatcher(type))
})

function setTimeoutErrorTest (type, matcher) {
  testDriver.test(`${type} - an error in setTimeout is noticed and harvested`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        `(function timeoutCallback () {
          setTimeout(function () {
            throw new Error('timeout callback')
          }, 0)
        })()`
      ]
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
      t.equal(actualError.params.message, 'timeout callback', 'Should have correct message')
      t.ok(actualError.params.stack_trace, 'Should have a stack trace')
      t.end()
    }).catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}
