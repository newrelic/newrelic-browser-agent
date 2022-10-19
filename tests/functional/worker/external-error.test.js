/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { getErrorsFromResponse } = require('../err/assertion-helpers')
const { workerTypes } = require('./helpers')

let supported = testDriver.Matcher.withFeature('workers')

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

workerTypes.forEach(type => {
  externalTest(type)
})

function externalTest(type) {
  testDriver.test(`${type} - an external JS import that throws an error generates and sends an error object`, supported, function (t, browser, router) {
    const externalURL = '../../js/external-uncaught-error.js?secretParameter=secretValue'
    const importType = type === 'classic' ? 'importScripts' : 'import'
    const importStatement = `${importType}('${externalURL}')`
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => `${importStatement}`
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
      const { err } = JSON.parse(errResponse.body)
      console.log(err)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'Error', 'Should be Error class')
      t.equal(err[0].params.message, 'thrown error', 'Should have correct message')
      t.ok(err[0].params.stack_trace, 'Should have a stack trace')
      t.deepEqual(err[0].custom, {worker: true}, 'Should have correct custom attributes')
      t.end()
    }).catch(fail)

    function fail(err) {
      t.error(err)
      t.end()
    }
  })
}

function expectedErrorForBrowser(browser) {
  if (browser.match('ie@<11')) {
    return 'asdf'
  } else if (browser.match('firefox@<35')) {
    return 'Error'
  } else if (browser.match('chrome, firefox@>=35, ie@11, android@>=4.4, safari@>=10, edge')) {
    return '[object Object]'
  } else if (browser.match('android')) {
    return 'Uncaught Error: [object Object]'
  } else {
    return 'Error: [object Object]'
  }
}