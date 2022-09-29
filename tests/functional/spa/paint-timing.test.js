/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')
var firstPaint = testDriver.Matcher.withFeature('firstPaint')
var firstContentfulPaint = testDriver.Matcher.withFeature('firstContentfulPaint')

testDriver.test('First paint for supported browsers', firstPaint.and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html', { loader: 'spa' }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let {body, query} = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.ok(interactionTree.firstPaint > 0, 'firstPaint has positive value')
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
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html', { loader: 'spa' }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let {body, query} = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.ok(interactionTree.firstContentfulPaint > 0, 'firstContentfulPaint has positive value')
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
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html', { loader: 'spa' }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let {body, query} = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.ok(interactionTree.firstPaint === null, 'firstPaint should not exist')
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
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('instrumented.html', { loader: 'spa' }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let {body, query} = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.ok(interactionTree.firstContentfulPaint === null, 'firstContentfulPaint should not exist')
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('route change interactions should not contain paint metrics values', firstPaint.intersect(firstContentfulPaint).and(notSafariWithSeleniumBug), function (t, browser, router) {
  t.plan(3)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/xhr.html', { loader: 'spa' }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      // click to start a route change interaction
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()
      return Promise.all([eventPromise, domPromise])
    })
    .then(([eventsResult]) => {
      let {body, query} = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.category, 'Route change', 'should be route change interaction')
      t.ok(interactionTree.firstPaint === null, 'firstPaint should not exist')
      t.ok(interactionTree.firstContentfulPaint === null, 'firstContentfulPaint should not exist')
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
