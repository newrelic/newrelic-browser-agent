/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher, workerCustomAttrs } = require('./helpers')
const { fail } = require('../err/assertion-helpers') // shared from jserrors feat tests

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

workerTypes.forEach(type => {
  noticeErrorTest(type, typeToMatcher(type))
  noticeErrorStringTest(type, typeToMatcher(type))
  noticeErrorWithParamsTest(type, typeToMatcher(type))
  multipleMatchingErrorsTest(type, typeToMatcher(type))
})

function noticeErrorTest (type, supportRegOrESMWorker) {
  testDriver.test(`${type} - noticeError generates and sends an error object`, supportRegOrESMWorker, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => newrelic.noticeError(new Error('test'))
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request }]) => {
      const { err } = JSON.parse(request.body)
      checkBasics(t, err)
      t.deepEqual(err[0].custom, { ...workerCustomAttrs }, 'Should not have correct custom attributes')
      t.end()
    }).catch(fail(t))
  })
}

function noticeErrorStringTest (type, supportRegOrESMWorker) {
  testDriver.test(`${type} - noticeError works with string argument`, supportRegOrESMWorker, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: ['newrelic.noticeError("test")']
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request }]) => {
      const { err } = JSON.parse(request.body)
      checkBasics(t, err)
      t.deepEqual(err[0].custom, { ...workerCustomAttrs }, 'Should not have correct custom attributes')
      t.end()
    }).catch(fail(t))
  })
}

function noticeErrorWithParamsTest (type, supportRegOrESMWorker) {
  testDriver.test(`${type} - noticeError generates and sends an error object with custom params`, supportRegOrESMWorker, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => newrelic.noticeError(new Error('test'), { hi: 'mom' })
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request }]) => {
      const { err } = JSON.parse(request.body)
      checkBasics(t, err)
      t.deepEqual(err[0].custom, { hi: 'mom', ...workerCustomAttrs }, 'Should have correct custom attributes')
      t.end()
    }).catch(fail(t))
  })
}

function multipleMatchingErrorsTest (type, supportRegOrESMWorker) {
  testDriver.test(`${type} - multiple matching errors are aggregated`, supportRegOrESMWorker, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => newrelic.noticeError(new Error('test')),
        () => newrelic.noticeError(new Error('test')),
        () => newrelic.noticeError(new Error('test'))
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request }]) => {
      const { err } = JSON.parse(request.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 3, 'Should have aggregated 3 errors')
      t.end()
    }).catch(fail(t))
  })
}

// TODO
/* See above (multipleMatchingErrorsTest)
* This behavior persists even in mismatched errors if they are on the same row number, because column numbers are currently ignored.
* A new test should be added once that issue is addressed, to check that mismatched errors within the same row are NOT aggregated
*/

function checkBasics (t, err) {
  t.equal(err.length, 1, 'Should have 1 error obj')
  t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
  t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
  t.equal(err[0].params.exceptionClass, 'Error', 'Should be Error class')
  t.equal(err[0].params.message, 'test', 'Should have correct message')
  t.ok(err[0].params.stack_trace, 'Should have a stack trace')
}
