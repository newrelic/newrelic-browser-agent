/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const { fail, url, cleanURL } = require('./uncat-internal-help.cjs')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')
let originOnlyReferer = testDriver.Matcher.withFeature('originOnlyReferer')
const FAIL_MSG = 'unexpected error'

testDriver.test('referrer attribute is sent in the query string', notSafariWithSeleniumBug, function (t, browser, router) {
  t.plan(1)
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    t.ok(query.ref, 'The query string should include the ref attribute.')
  }).catch(fail(t, FAIL_MSG))
})

testDriver.test('referrer sent in query does not include query parameters', notSafariWithSeleniumBug, function (t, browser, router) {
  t.plan(1)
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    var queryRefUrl = url.parse(query.ref)
    t.ok(queryRefUrl.query == null, 'url in ref query param does not contain query parameters')
  }).catch(fail(t, FAIL_MSG))
})

testDriver.test('referrer sent in referer header includes path', originOnlyReferer.inverse().and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(1)
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{ request: { headers } }]) => {
    var headerUrl = url.parse(headers.referer)
    t.ok(headerUrl.query != null, 'url in referer header contains query parameters')
  }).catch(fail(t, FAIL_MSG))
})

testDriver.test('when url is changed using pushState during load', notSafariWithSeleniumBug, function (t, browser, router) {
  var originalUrl = router.assetURL('referrer-pushstate.html')
  var originalPath = url.parse(originalUrl).pathname
  var redirectedPath = url.parse(router.assetURL('instrumented.html')).pathname

  t.test('header', function (t) {
    t.plan(1)

    if (originOnlyReferer.match(browser)) {
      t.ok('browser does not send full referrer by default')
      return
    }

    let loadPromise = browser.get(originalUrl)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise]).then(([{ request: { headers } }]) => {
      var headerUrl = url.parse(headers.referer)
      t.equal(headerUrl.pathname, redirectedPath, 'referer header contains the redirected URL')
    }).catch(fail(t, FAIL_MSG))
  })

  t.test('query param', function (t) {
    t.plan(1)
    let loadPromise = browser.get(originalUrl)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
      var queryRefUrl = url.parse(query.ref)
      t.equal(queryRefUrl.pathname, redirectedPath, 'ref param contains the redirected URL')
    }).catch(fail(t, FAIL_MSG))
  })
})

testDriver.test('when url is changed using replaceState during load', notSafariWithSeleniumBug, function (t, browser, router) {
  var originalUrl = router.assetURL('referrer-replacestate.html')
  var originalPath = url.parse(originalUrl).pathname
  var redirectedPath = url.parse(router.assetURL('instrumented.html')).pathname

  t.test('header', function (t) {
    t.plan(1)

    if (originOnlyReferer.match(browser)) {
      t.ok('browser does not send full referrer by default')
      return
    }

    let loadPromise = browser.get(originalUrl)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise]).then(([{ request: { headers } }]) => {
      var headerUrl = url.parse(headers.referer)
      t.equal(headerUrl.pathname, redirectedPath, 'referer header contains the redirected URL')
    }).catch(fail(t, FAIL_MSG))
  })

  t.test('query param', function (t) {
    t.plan(1)

    let loadPromise = browser.get(originalUrl)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
      var queryRefUrl = url.parse(query.ref)
      t.equal(queryRefUrl.pathname, redirectedPath, 'ref param contains the redirected URL')
    }).catch(fail(t, FAIL_MSG))
  })
})

testDriver.test('browsers that do not decode the url when accessing window.location encode special characters in the referrer attribute', notSafariWithSeleniumBug, function (t, browser, router) {
  t.plan(2)
  let assetURL = router.assetURL('symbols%20in&referrer.html')
  let loadPromise = browser.safeGet(assetURL).catch(fail(t, FAIL_MSG))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    let cleanAssetURL = cleanURL(assetURL)
    t.ok(query.ref, 'The query string should include the ref attribute.')
    t.equal(query.ref, cleanAssetURL, 'The ref attribute should be the same as the assetURL')
  }).catch(fail(t, FAIL_MSG))
})

testDriver.test('cookie disabled: query string attributes', notSafariWithSeleniumBug, function (t, browser, router) {
  t.plan(2)
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html', {
    init: { privacy: { cookies_enabled: false } }
  }))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    t.equal(query.ck, '0', "The cookie flag ('ck') should equal 0.")
    t.equal(query.s, '0', "The session id attr 's' should be 0.")
  }).catch(fail(t, FAIL_MSG))
})

testDriver.test('cookie enabled by default: query string attributes', notSafariWithSeleniumBug, function (t, browser, router) {
  t.plan(2)
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{ request: { query } }]) => {
    t.equal(query.ck, '0', "The cookie flag ('ck') should equal 0.")
    t.notEqual(query.s, '0', "The session id ('s') should NOT be 0.")
  }).catch(fail(t, FAIL_MSG))
})
