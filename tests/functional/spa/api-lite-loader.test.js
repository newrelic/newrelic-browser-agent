/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

const asserters = testDriver.asserters

let supported = testDriver.Matcher.withFeature('addEventListener')

testDriver.test('using SPA API with the lite loader', supported, function (t, browser, router) {
  t.plan(1)

  browser
    .safeGet(router.assetURL('spa/api-tracers.html', { loader: 'rum' }))
    .waitForFeature('loaded')
    .elementByCssSelector('body')
    .click()
    .waitFor(asserters.jsCondition('window.firedCallbacks.syncCallback'))
    .waitFor(asserters.jsCondition('window.firedCallbacks.asyncCallback'))
    .then(() => t.ok(1, 'callbacks passed to SPA API functions fired'))
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('sends interaction id and nodeId', supported, function (t, browser, router) {
  t.plan(4)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/api-tracers-captured.html', { loader: 'spa' })).waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let eventPromise = router.expectEvents()
      let domPromise = browser
        .elementByCssSelector('body')
        .click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.ok(interactionTree.id, 'interaction has id')
      t.ok(interactionTree.nodeId, 'interaction has nodeId')

      var childNode = interactionTree.children[0]

      t.ok(childNode.nodeId, 'has nodeId attribute')
      t.equal(childNode.type, 'customTracer', 'should be an custom node')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
