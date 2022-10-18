/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('workers')

const init =  {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

testDriver.test('classic - noticeError generates and sends an error object', supported, function (t, browser, router) {
  let assetURL = router.assetURL('worker/classic-worker.html', {
    init,
    workerCommands: [
      () => newrelic.noticeError(new Error('test'))
    ].map(x => x.toString())
  })

  let loadPromise = browser.get(assetURL)
  let errPromise = router.expectErrors()

  Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
    const { err } = JSON.parse(errResponse.body)
    checkBasics(t, err)
    t.deepEqual(err[0].custom, {}, 'Should not have custom attributes')
    t.end()
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('module - noticeError generates and sends an error object', supported, function (t, browser, router) {
  let assetURL = router.assetURL('worker/module-worker.html', {
    init,
    workerCommands: [
      () => newrelic.noticeError(new Error('test'))
    ].map(x => x.toString())
  })

  let loadPromise = browser.get(assetURL)
  let errPromise = router.expectErrors()

  Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
    const { err } = JSON.parse(errResponse.body)
    checkBasics(t, err)
    t.deepEqual(err[0].custom, {}, 'Should not have custom attributes')
    t.end()
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('classic - noticeError generates and sends an error object with custom params', supported, function (t, browser, router) {
  let assetURL = router.assetURL('worker/classic-worker.html', {
    init,
    workerCommands: [
      () => newrelic.noticeError(new Error('test'), { hi: 'mom' })
    ].map(x => x.toString())
  })

  let loadPromise = browser.get(assetURL)
  let errPromise = router.expectErrors()

  Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
    const { err } = JSON.parse(errResponse.body)
    checkBasics(t, err)
    t.deepEqual(err[0].custom, { hi: 'mom' }, 'Should have custom attributes')
    t.end()
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('module - noticeError generates and sends an error object with custom params', supported, function (t, browser, router) {
  let assetURL = router.assetURL('worker/module-worker.html', {
    init,
    workerCommands: [
      () => newrelic.noticeError(new Error('test'), { hi: 'mom' })
    ].map(x => x.toString())
  })

  let loadPromise = browser.get(assetURL)
  let errPromise = router.expectErrors()

  Promise.all([errPromise, loadPromise]).then(([errResponse]) => {
    const { err } = JSON.parse(errResponse.body)
    checkBasics(t, err)
    t.deepEqual(err[0].custom, { hi: 'mom' }, 'Should have custom attributes')
    t.end()
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

function checkBasics(t, err) {
  t.equal(err.length, 1, 'Should have 1 error obj')
  t.equal(err[0].metrics.count, 1, 'Should have seen 1 error')
  t.ok(err[0].metrics.time.t > 0, 'Should have a valid timestamp')
  t.equal(err[0].params.exceptionClass, 'Error', 'Should be Error class')
  t.equal(err[0].params.message, 'test', 'Should have correct message')
  t.ok(err[0].params.stack_trace, 'Should have a stack trace')
}