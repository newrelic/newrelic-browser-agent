/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const {workerTypes, typeToMatcher} = require('./helpers')

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

workerTypes.forEach(type => {
  referenceErrorTest(type, typeToMatcher(type))
  thrownErrorTest(type, typeToMatcher(type))
  unhandledPromiseRejectionTest(type, typeToMatcher(type))
  rangeErrorTest(type, typeToMatcher(type))
  syntaxErrorTest(type, typeToMatcher(type))
  typeErrorTest(type, typeToMatcher(type))
  uriErrorTest(type, typeToMatcher(type))
  memoryLeakTest(type, typeToMatcher(type))
})

function referenceErrorTest(type, matcher) {
  testDriver.test(`${type} - a reference error generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => { var a = b.c }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'ReferenceError', 'Should be ReferenceError class')
      t.equal(err[0].params.message, 'b is not defined', 'Should have correct message')
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

function unhandledPromiseRejectionTest(type, matcher) {
  testDriver.test(`${type} - unhandledPromise generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => { new Promise(() => { throw new Error("unhandledPromiseRejection") }) }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'Error', 'Should be Error class')
      t.ok(err[0].params.message.includes("unhandledPromiseRejection"), 'Should have correct message')
      t.ok(err[0].params.stack_trace, 'Should have a stack trace')
      t.deepEqual(err[0].custom, { unhandledPromiseRejection: 1, worker: true }, 'Should have custom attribute')
      t.end()
    }).catch(fail)

    function fail(err) {
      t.error(err)
      t.end()
    }
  })
}

function rangeErrorTest(type, matcher) {
  testDriver.test(`${type} - RangeError generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => {
          const arr = [90, 88]
          arr.length = 90 ** 99
        }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'RangeError', 'Should be RangeError class')
      t.equal(err[0].params.message, 'Invalid array length', 'Should have correct message')
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

function typeErrorTest(type, matcher) {
  testDriver.test(`${type} - TypeError generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => {
          const num = 123
          num.toUpperCase()
        }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'TypeError', 'Should be TypeError class')
      t.equal(err[0].params.message, 'num.toUpperCase is not a function', 'Should have correct message')
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

function uriErrorTest(type, matcher) {
  testDriver.test(`${type} - URIError generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => {
          decodeURI("%")
        }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'URIError', 'Should be URIError class')
      t.equal(err[0].params.message, 'URI malformed', 'Should have correct message')
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

function memoryLeakTest(type, matcher) {
  testDriver.test(`${type} - max call stack size generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => {
          function foo(){
            foo()
          }
          foo();
        }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'RangeError', 'Should be RangeError class')
      t.equal(err[0].params.message, 'Maximum call stack size exceeded', 'Should have correct message')
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

function syntaxErrorTest(type, matcher) {
  testDriver.test(`${type} - SyntaxError generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        `() => {
          const test a = 'test'
        }`
      ]
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'SyntaxError', 'Should be SyntaxError class')
      t.equal(err[0].params.message, 'Missing initializer in const declaration', 'Should have correct message')
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

function thrownErrorTest(type, matcher) {
  testDriver.test(`${type} - a thrown error generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => { throw new Error('thrown error') }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
      const { err } = JSON.parse(errResponse.body)
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