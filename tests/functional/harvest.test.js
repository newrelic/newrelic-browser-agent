/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const cleanURL = require('../../agent/clean-url.js')
const url = require('url')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')
let locationDecodesUrl = testDriver.Matcher.withFeature('locationDecodesUrl')
let withTls = testDriver.Matcher.withFeature('tls')
let withPushState = testDriver.Matcher.withFeature('pushstate')
const originOnlyReferer = testDriver.Matcher.withFeature('originOnlyReferer')

testDriver.test('referrer attribute is sent in the query string', withTls.and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(1)
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{query}]) => {
    t.ok(query.ref, 'The query string should include the ref attribute.')
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('referrer sent in query does not include query parameters', withTls.and(notSafariWithSeleniumBug), function(t, browser, router) {
  t.plan(1)
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{query, headers}]) => {
    var queryRefUrl = url.parse(query.ref)
    t.ok(queryRefUrl.query == null, 'url in ref query param does not contain query parameters')
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('referrer sent in referer header includes path', originOnlyReferer.include('ios', '>11.2').inverse().and(notSafariWithSeleniumBug), function(t, browser, router) {
  t.plan(1)
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{query, headers}]) => {
    var headerUrl = url.parse(headers.referer)
    t.ok(headerUrl.query != null, 'url in referer header contains query parameters')
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('when url is changed using pushState during load', withPushState.and(notSafariWithSeleniumBug), function(t, browser, router) {
  var originalUrl = router.assetURL('referrer-pushstate.html')
  var originalPath = url.parse(originalUrl).pathname
  var redirectedPath = url.parse(router.assetURL('instrumented.html')).pathname

  t.test('header', function(t) {
    t.plan(1)

    if (originOnlyReferer.match(browser)) {
      t.ok('browser does not send full referrer by default')
      return
    }

    let loadPromise = browser.get(originalUrl)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise]).then(([{query, headers}]) => {
      var headerUrl = url.parse(headers.referer)
      if (browser.match('ie@10')) {
        t.equal(headerUrl.pathname, originalPath, 'referer header contains the original URL in IE 10')
      } else {
        t.equal(headerUrl.pathname, redirectedPath, 'referer header contains the redirected URL')
      }
    }).catch(fail)

    function fail (err) {
      t.error(err, 'unexpected error')
      t.end()
    }
  })

  t.test('query param', function(t) {
    t.plan(1)
    let loadPromise = browser.get(originalUrl)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise]).then(([{query, headers}]) => {
      var queryRefUrl = url.parse(query.ref)
      t.equal(queryRefUrl.pathname, redirectedPath, 'ref param contains the redirected URL')
    }).catch(fail)

    function fail (err) {
      t.error(err, 'unexpected error')
      t.end()
    }
  })
})

testDriver.test('when url is changed using replaceState during load', withPushState.and(notSafariWithSeleniumBug), function(t, browser, router) {
  var originalUrl = router.assetURL('referrer-replacestate.html')
  var originalPath = url.parse(originalUrl).pathname
  var redirectedPath = url.parse(router.assetURL('instrumented.html')).pathname

  t.test('header', function(t) {
    t.plan(1)

    if (originOnlyReferer.match(browser)) {
      t.ok('browser does not send full referrer by default')
      return
    }

    let loadPromise = browser.get(originalUrl)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise]).then(([{query, headers}]) => {
      var headerUrl = url.parse(headers.referer)
      if (browser.match('ie@10')) {
        t.equal(headerUrl.pathname, originalPath, 'referer header contains the original URL in IE 10')
      } else {
        t.equal(headerUrl.pathname, redirectedPath, 'referer header contains the redirected URL')
      }
    }).catch(fail)

    function fail (err) {
      t.error(err, 'unexpected error')
      t.end()
    }
  })

  t.test('query param', function(t) {
    t.plan(1)

    let loadPromise = browser.get(originalUrl)
    let rumPromise = router.expectRum()

    Promise.all([rumPromise, loadPromise]).then(([{query, headers}]) => {
      var queryRefUrl = url.parse(query.ref)
      t.equal(queryRefUrl.pathname, redirectedPath, 'ref param contains the redirected URL')
    }).catch(fail)

    function fail (err) {
      t.error(err, 'unexpected error')
      t.end()
    }
  })
})

testDriver.test('browsers that do not decode the url when accessing window.location encode special characters in the referrer attribute', locationDecodesUrl.inverse().and(withTls).and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(2)
  let assetURL = router.assetURL('symbols%20in&referrer.html')
  let loadPromise = browser.safeGet(assetURL).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{query}]) => {
    let cleanAssetURL = cleanURL(assetURL)
    t.ok(query.ref, 'The query string should include the ref attribute.')
    t.equal(query.ref, cleanAssetURL, 'The ref attribute should be the same as the assetURL')
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('browsers that decode the url when accessing window.location submit non url encoded special characters in the referrer attribute', locationDecodesUrl.and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(3)
  let assetURL = router.assetURL('symbols%20in&referrer.html')
  let loadPromise = browser.safeGet(assetURL).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{search, query}]) => {
    let refString = search.match(/ref=.*\.html/)
    t.ok(query.ref, 'The query string should include the ref attribute.')
    t.ok(/\s/.test(refString), 'The url should contain whiteSpace.')
    t.notok(/&/.test(refString), 'The url should not contain a special character.')
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('cookie disabled: query string attributes', withTls.and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(2)
  let loadPromise = browser.safeGet(router.assetURL('instrumented-disable-cookies.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{ query }]) => {
    t.equal(query.ck, '0', "The cookie flag ('ck') should equal 0.");
    t.equal(query.s, '0', "The session id attr 's' should be 0.");
  }).catch(fail)

  function fail(err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})

testDriver.test('cookie enabled by default: query string attributes', withTls.and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(2)
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise]).then(([{ query }]) => {
    t.equal(query.ck, '0', "The cookie flag ('ck') should equal 0.");
    t.notEqual(query.s, '0', "The session id ('s') should NOT be 0.");
  }).catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})
