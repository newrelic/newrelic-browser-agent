/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { fail, getXhrFromResponse } = require('./helpers')

const asserters = testDriver.asserters
var supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('no abort call in xhr request', supported, function (t, browser, router) {
  t.plan(12)

  let rumPromise = router.expectRum()
  let ajaxPromise = router.expectAjaxTimeSlices()
  let loadPromise = browser.get(router.assetURL('xhr.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  })).waitFor(asserters.jsCondition('window.xhrDone'))

  Promise.all([ajaxPromise, rumPromise, loadPromise]).then(([{ request }]) => {
    const parsedXhrs = getXhrFromResponse(request, browser)
    t.ok(parsedXhrs, 'got XHR data')
    t.ok(parsedXhrs.length >= 1, 'has at least one XHR record')
    t.ok(parsedXhrs.find(function (xhr) {
      return xhr.params && xhr.params.pathname === '/json'
    }), 'has xhr with /json endpoint')
    for (const parsedXhr of parsedXhrs) {
      if (parsedXhr.params.pathname === '/json') {
        t.equal(parsedXhr.params.method, 'GET', 'has GET method')
        t.ok(parsedXhr.params.host, 'has a hostname')
        t.equal(parsedXhr.params.status, 200, 'has status of 200')
        t.ok(parsedXhr.metrics, 'has metrics')
        t.equal(parsedXhr.metrics.count, 1, 'has one metric count')
        t.ok(parsedXhr.metrics.duration && parsedXhr.metrics.duration.t >= 0, 'has duration >= 0')
        t.equal(parsedXhr.metrics.rxSize && parsedXhr.metrics.rxSize.t, 14, 'has rxSize of 14')
        t.ok(parsedXhr.metrics.cbTime && parsedXhr.metrics.cbTime.t >= 0, 'has cbTime >= 0')
        t.ok(parsedXhr.metrics.time && parsedXhr.metrics.time.t >= 0, 'has time >= 0')
      }
    }
  }).catch(fail(t, 'unexpected error'))
})

testDriver.test('xhr.abort() called in load callback', supported, function (t, browser, router) {
  t.plan(13)

  let rumPromise = router.expectRum()
  let ajaxPromise = router.expectAjaxTimeSlices()
  let loadPromise = browser.get(router.assetURL('xhr-abort-onload.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  })).waitFor(asserters.jsCondition('window.xhrDone'))

  Promise.all([ajaxPromise, rumPromise, loadPromise]).then(([{ request }]) => {
    const parsedXhrs = getXhrFromResponse(request, browser)
    t.ok(parsedXhrs, 'got XHR data')
    t.ok(parsedXhrs.length >= 1, 'has at least one XHR record')
    t.ok(parsedXhrs.find(function (xhr) {
      return xhr.params && xhr.params.pathname === '/xhr_with_cat/1'
    }), 'has xhr with /xhr_with_cat/1 endpoint')
    for (const parsedXhr of parsedXhrs) {
      if (parsedXhr.params.pathname === '/xhr_with_cat/1') {
        t.equal(parsedXhr.params.method, 'GET', 'has GET method')
        t.ok(parsedXhr.params.host, 'has a hostname')
        t.equal(parsedXhr.params.status, 200, 'has status of 200')
        t.equal(parsedXhr.params.cat, 'foo', 'has CAT data for /xhr_with_cat')
        t.ok(parsedXhr.metrics, 'has metrics')
        t.equal(parsedXhr.metrics.count, 1, 'has one metric count')
        t.ok(parsedXhr.metrics.duration && parsedXhr.metrics.duration.t >= 0, 'has duration >= 0')
        t.equal(parsedXhr.metrics.rxSize && parsedXhr.metrics.rxSize.t, 409, 'has rxSize of 409')
        t.ok(parsedXhr.metrics.cbTime && parsedXhr.metrics.cbTime.t >= 0, 'has cbTime >= 0')
        t.ok(parsedXhr.metrics.time && parsedXhr.metrics.time.t >= 0, 'has time >= 0')
      }
    }
  }).catch(fail(t, 'unexpected error'))
})
