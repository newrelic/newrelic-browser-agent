/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

let supported = testDriver.Matcher.withFeature('wrappableAddEventListener')

testDriver.test('capturing SPA interactions', supported, function (t, browser, router) {
  t.plan(5)
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/multiple-load.html', { loader: 'spa' }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let {body, query} = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 2, 'expect 2 xhr children')
      t.equal(interactionTree.children[0].type, 'ajax', 'first child should be an ajax')
      t.equal(interactionTree.children[1].type, 'ajax', 'second child should be an ajax')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
