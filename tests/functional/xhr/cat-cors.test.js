/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { fail } = require('./helpers')

testDriver.test('does not set CAT header on cross-origin XHRs', function (t, browser, router) {
  t.plan(1)
  const ajaxPromise = router.expect('bamServer', {
    test: function (request) {
      const url = new URL(request.url, 'resolve://')
      return url.pathname === `/cat-cors/${router.testId}`
    }
  })
  let loadPromise = browser.get(router.assetURL('cat-cors.html', { testId: router.testId }))

  Promise.all([ajaxPromise, loadPromise])
    .then(([{ request }]) => {
      t.notok(request.headers['x-newrelic-id'], 'cross-origin XHR should not have CAT header')
    })
    .catch(fail(t, 'unexpected error'))
})

testDriver.test('sets CAT header on same origin XHRs if xpid is defined', function (t, browser, router) {
  t.plan(1)
  const ajaxPromise = router.expect('assetServer', {
    test: function (request) {
      const url = new URL(request.url, 'resolve://')
      return url.pathname === `/same-origin/${router.testId}`
    }
  })
  let loadPromise = browser.get(router.assetURL('cat-same-origin.html', { testId: router.testId }))

  Promise.all([ajaxPromise, loadPromise])
    .then(([{ request }]) => {
      t.ok(request.headers['x-newrelic-id'], 'same-origin XHR should have CAT header if xpid is specified')
    })
    .catch(fail(t, 'unexpected error'))
})

testDriver.test('does not set CAT header on same origin XHRs if xpid is undefined', function (t, browser, router) {
  t.plan(1)
  const ajaxPromise = router.expect('assetServer', {
    test: function (request) {
      const url = new URL(request.url, 'resolve://')
      return url.pathname === `/same-origin/${router.testId}`
    }
  })
  let loadPromise = browser.get(router.assetURL('cat-same-origin.html', { testId: router.testId, xpid: '' }))

  Promise.all([ajaxPromise, loadPromise])
    .then(([{ request }]) => {
      t.notok(request.headers['x-newrelic-id'], 'same-origin XHR should not have CAT header if xpid is undefined')
    })
    .catch(fail(t, 'unexpected error'))
})
