/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { fail } = require('./helpers')

testDriver.test('does not set CAT headers on outbound XHRs to different origin', function (t, browser, router) {
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
