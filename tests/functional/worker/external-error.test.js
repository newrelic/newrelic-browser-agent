/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { getErrorsFromResponse } = require('../err/assertion-helpers')
const { workerTypes, typeToMatcher, workerCustomAttrs } = require('./helpers')

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

workerTypes.forEach(type => {
  externalTest(type, typeToMatcher(type))
})

function externalTest (type, matcher) {
  testDriver.test(`${type} - an external JS import that throws an error generates and sends an error object`, matcher, function (t, browser, router) {
    const workerCommands = []
    if (type === 'classic') workerCommands.push("importScripts('/tests/assets/js/external-worker-error.js?secretParameter=secretValue')")
    else workerCommands.push("import('/tests/assets/js/external-worker-error.js?secretParameter=secretValue')")
    workerCommands.push('setTimeout(() => externalFunction(), 1000)')
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request }]) => {
      const { err } = JSON.parse(request.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'Error', 'Should be Error class')
      t.equal(err[0].params.message, 'worker error', 'Should have correct message')
      t.ok(err[0].params.stack_trace, 'Should have a stack trace')
      t.deepEqual(err[0].custom, { ...workerCustomAttrs }, 'Should have correct custom attributes')
      t.end()
    }).catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}
