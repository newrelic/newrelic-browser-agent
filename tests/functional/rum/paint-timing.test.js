/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')
var firstPaint = testDriver.Matcher.withFeature('firstPaint')
var firstContentfulPaint = testDriver.Matcher.withFeature('firstContentfulPaint')

testDriver.test('First paint for supported browsers', firstPaint.and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      try {
        const firstPaint = Number(query.fp)
        t.ok(firstPaint > 0, 'firstPaint has a positive value')
      } catch (e) {
        t.fail('Failed to get paint timings: ' + e.message + ', query = ' + query)
      }
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('First contentful paint for supported browsers', firstContentfulPaint.and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      try {
        const firstContentfulPaint = Number(query.fcp)
        t.ok(firstContentfulPaint > 0, 'firstContentfulPaint has a positive value')
      } catch (e) {
        t.fail('Failed to get paint timings: ' + e.message + ', query = ' + query)
      }
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('First paint for unsupported browsers', firstPaint.inverse().and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      try {
        const firstPaint = query.fp
        t.ok(firstPaint === undefined, 'firstPaint should not exist')
      } catch (e) {
        t.fail('Failed to get paint timings: ' + e.message + ', query = ' + query)
      }
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('First contentful paint for unsupported browsers', firstContentfulPaint.inverse().and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html'))

  Promise.all([rumPromise, loadPromise])
    .then(([{ request: { query } }]) => {
      try {
        const firstContentfulPaint = query.fcp
        t.ok(firstContentfulPaint === undefined, 'firstContentfulPaint should not exist')
      } catch (e) {
        t.fail('Failed to get paint timings: ' + e.message + ', query = ' + query)
      }
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
