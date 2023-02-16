/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

let supported = testDriver.Matcher.withFeature('addEventListener')

testDriver.test('sends SPA interactions even if endInteraction() is called before the window.load() event', supported, function (t, browser, router) {
  t.plan(8)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/initial-page-load-with-end-interaction.html', { loader: 'spa' }))
    .waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 1, 'expect one child node')
      t.equal(interactionTree.children[0].type, 'customEnd', 'expect one custom end node')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')

      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.ok(interactionTree.end >= interactionTree.start, 'interaction end time should be >= start')
      t.ok(interactionTree.callbackEnd >= interactionTree.start, 'interaaction callback end should be >= interaction start')
      t.ok(interactionTree.callbackEnd <= interactionTree.end, 'interaction callback end should be <= interaction end')
      t.equal(interactionTree.children.length, 1, 'expected one child node')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
