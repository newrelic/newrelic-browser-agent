/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { fail } = require('./helpers')

var supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('xhr instrumentation works with bad XHR constructor runtime-patch', supported, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let ajaxPromise = router.expectAjaxTimeSlices()
  let loadPromise = browser.get(router.assetURL('xhr-constructor-runtime-patched.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  }))

  Promise.all([ajaxPromise, rumPromise, loadPromise]).then(([{ request: { query, body } }]) => {
    try {
      const parsedBody = JSON.parse(body)
      t.ok(parsedBody.xhr, 'got XHR data')
    } catch (err) {
      t.ok(query.xhr, 'got XHR data')
    }
  }).catch(fail(t, 'unexpected error'))
})
