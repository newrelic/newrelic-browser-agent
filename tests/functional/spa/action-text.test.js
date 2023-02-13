/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')
let supported = testDriver.Matcher.withFeature('hasInnerText')
  .and(notSafariWithSeleniumBug)

const init = {
  ajax: {
    deny_list: ['bam-test-1.nr-local.net']
  }
}

testDriver.test('captures innerText', supported, function (t, browser, router) {
  t.plan(5)
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/action-text.html', { loader: 'spa', init })).waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 0, 'expect no child nodes')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')

      let eventPromise = router.expectEvents()
      let domPromise = browser
        .elementByCssSelector('#one')
        .click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.children.length, 1, 'expected one child node')
      t.deepEqual(interactionTree.children[0], {
        type: 'stringAttribute',
        key: 'actionText',
        value: '#1'
      })
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('captures value', supported, function (t, browser, router) {
  t.plan(5)
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/action-text.html', { loader: 'spa', init })).waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 0, 'expect no child nodes')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')

      let eventPromise = router.expectEvents()
      let domPromise = browser
        .elementByCssSelector('#two')
        .click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.children.length, 1, 'expected one child node')
      t.deepEqual(interactionTree.children[0], {
        type: 'stringAttribute',
        key: 'actionText',
        value: '#2'
      })
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('captures title', supported, function (t, browser, router) {
  t.plan(5)
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/action-text.html', { loader: 'spa', init })).waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 0, 'expect no child nodes')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')

      let eventPromise = router.expectEvents()
      let domPromise = browser
        .elementByCssSelector('#three')
        .click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.children.length, 1, 'expected one child node')
      t.deepEqual(interactionTree.children[0], {
        type: 'stringAttribute',
        key: 'actionText',
        value: '#3'
      })
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('does not capture body text', supported, function (t, browser, router) {
  t.plan(4)
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/action-text.html', { loader: 'spa', init })).waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 0, 'expect no child nodes')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')

      let eventPromise = router.expectEvents()
      let domPromise = browser
        .elementByCssSelector('body')
        .catch(function () {
          // zonejs causes an error with webdriver in firefox, this only
          // happens on the first query.
          // https://github.com/angular/zone.js/issues/234
        })
        .elementByCssSelector('body')
        .click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.children.length, 0, 'expected no child nodes')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
