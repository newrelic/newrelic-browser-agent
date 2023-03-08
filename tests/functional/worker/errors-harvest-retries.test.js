/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { getErrorsFromResponse } = require('../err/assertion-helpers')
const { workerTypes, typeToMatcher } = require('./helpers')
const { testErrorsRequest } = require('../../../tools/testing-server/utils/expect-tests')

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

workerTypes.forEach(type => {
  errorRetryTest(type, typeToMatcher(type))
})

function errorRetryTest (type, matcher) {
  testDriver.test(`${type} - if server returns 429, errors are stored and retried`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => { throw new Error('test') }
      ].map(x => x.toString())
    })

    router.scheduleReply('bamServer', {
      test: testErrorsRequest,
      statusCode: 429
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([response]) => {
      t.equal(response.reply.statusCode, 429, 'server responded with 429')
      firstBody = JSON.parse(response.request.body).err
      return router.expectErrors()
    }).then(({ request }) => {
      const actualErrors = getErrorsFromResponse(request, browser)

      t.equal(actualErrors.length, 1, 'exactly one error')

      let actualError = actualErrors[0]
      t.equal(actualError.metrics.count, 1, 'Should have seen 1 error')
      t.ok(actualError.metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(actualError.params.exceptionClass, 'Error', 'Should be Error class')
      t.equal(actualError.params.message, 'test', 'Should have correct message')
      t.ok(actualError.params.stack_trace, 'Should have a stack trace')
      t.end()
    }).catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}
