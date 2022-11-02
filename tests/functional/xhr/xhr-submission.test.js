/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { fail, getXhrFromResponse } = require('./helpers')

let reliableUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')
let xhrBrowsers = testDriver.Matcher.withFeature('xhr')
let fetchBrowsers = testDriver.Matcher.withFeature('fetch')
let sendBeaconBrowsers = testDriver.Matcher.withFeature('sendBeacon')
let brokenBeaconBrowsers = testDriver.Matcher.withFeature('brokenSendBeacon')
let xhrSupported = xhrBrowsers.intersect(reliableUnload)
let fetchSupported = fetchBrowsers.intersect(reliableUnload)

testDriver.test('capturing XHR metrics', xhrSupported, function (t, browser, router) {
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('xhr.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([response]) => {
      if (sendBeaconBrowsers.match(browser) && !brokenBeaconBrowsers.match(browser)) {
        t.equal(response.req.method, 'POST', 'XHR data submitted via POST request from sendBeacon')
        t.ok(response.body, 'request body should not be empty')
      } else {
        t.equal(response.req.method, 'GET', 'XHR data submitted via GET request')
        t.notOk(response.body, 'request body should be empty')
      }

      const parsedXhrs = getXhrFromResponse(response, browser)
      t.ok(parsedXhrs, 'has xhr data')
      t.ok(parsedXhrs.length >= 1, 'has at least one XHR record')
      t.deepEqual(['metrics', 'params'], Object.keys(parsedXhrs[0]).sort(), 'XHR record has correct keys')

      t.end()
    })
    .catch(fail(t))
})

testDriver.test('capturing fetch metrics', fetchSupported, function (t, browser, router) {
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('fetch.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([response]) => {
      if (sendBeaconBrowsers.match(browser) && !brokenBeaconBrowsers.match(browser)) {
        t.equal(response.req.method, 'POST', 'XHR data submitted via POST request from sendBeacon')
        t.ok(response.body, 'request body should not be empty')
      } else {
        t.equal(response.req.method, 'GET', 'XHR data submitted via GET request')
        t.notOk(response.body, 'request body should be empty')
      }

      const parsedXhrs = getXhrFromResponse(response, browser)
      var fetchData = parsedXhrs.find(xhr => xhr.params.pathname === '/json')
      t.ok(fetchData, 'has xhr data')
      t.deepEqual(['metrics', 'params'], Object.keys(fetchData).sort(), 'XHR record has correct keys')
      t.end()
    })
    .catch(fail(t))
})
