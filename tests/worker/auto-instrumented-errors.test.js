/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher, workerCustomAttrs } = require('./helpers')

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

var timedPromiseAll = (promises, ms) => Promise.race([
  new Promise((resolve, reject) => {
    setTimeout(() => reject(), ms)
  }),
  Promise.all(promises)
])

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

function referenceErrorTest (type, matcher) {
  testDriver.test(`${type} - a reference error generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => { var a = b.c }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request: errResponse }]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'ReferenceError', 'Should be ReferenceError class')
      t.ok(!!err[0].params.message, 'Should have message')
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

function unhandledPromiseRejectionTest (type, matcher) {
  testDriver.test(`${type} - unhandledPromise generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => { new Promise(() => { throw new Error('unhandledPromiseRejection') }) }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    timedPromiseAll([errPromise, loadPromise, router.expectRum()], 6000).then(([{ request: errResponse }]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'Error', 'Should be Error class')
      t.ok(!!err[0].params.message, 'Should have message')
      t.ok(err[0].params.stack_trace, 'Should have a stack trace')
      t.deepEqual(err[0].custom, { ...workerCustomAttrs, unhandledPromiseRejection: 1 }, 'Should have custom attribute')
      t.end()
    }).catch(fail)

    function fail (err) {
      if (!browser.hasFeature('unhandledPromiseRejection')) t.pass('Browser does not support unhandledPromiseRejections')
      else t.error(err)
      t.end()
    }
  })
}

function rangeErrorTest (type, matcher) {
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

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request: errResponse }]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'RangeError', 'Should be RangeError class')
      t.ok(!!err[0].params.message, 'Should have message')
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

function typeErrorTest (type, matcher) {
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

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request: errResponse }]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'TypeError', 'Should be TypeError class')
      t.ok(!!err[0].params.message, 'Should have message')
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

function uriErrorTest (type, matcher) {
  testDriver.test(`${type} - URIError generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => {
          decodeURI('%')
        }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request: errResponse }]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'URIError', 'Should be URIError class')
      t.ok(!!err[0].params.message, 'Should have message')
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

function memoryLeakTest (type, matcher) {
  testDriver.test(`${type} - max call stack size generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => {
          let i = 0
          function foo () {
            i += 1
            foo()
          }
          foo()
        }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    timedPromiseAll([errPromise, loadPromise, router.expectRum()], 6000).then(([{ request: errResponse }]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'RangeError', 'Should be RangeError class')
      t.ok(!!err[0].params.message, 'Should have message')
      t.ok(err[0].params.stack_trace, 'Should have a stack trace')
      t.deepEqual(err[0].custom, { ...workerCustomAttrs }, 'Should have correct custom attributes')
      t.end()
    }).catch(fail)

    function fail (err) {
      if (browser.hasFeature('workerStackSizeGeneratesError')) t.pass('This browser version does not throw errors in worker when max stack size is reached')
      else t.error(err)
      t.end()
    }
  })
}

function syntaxErrorTest (type, matcher) {
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

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request: errResponse }]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'SyntaxError', 'Should be SyntaxError class')
      t.ok(!!err[0].params.message, 'Should have message')
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

function thrownErrorTest (type, matcher) {
  testDriver.test(`${type} - a thrown error generates and sends an error object`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => { throw new Error('thrown error') }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request: errResponse }]) => {
      const { err } = JSON.parse(errResponse.body)
      t.equal(err.length, 1, 'Should have 1 error obj')
      t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
      t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
      t.equal(err[0].params.exceptionClass, 'Error', 'Should be Error class')
      t.ok(!!err[0].params.message, 'Should have message')
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
