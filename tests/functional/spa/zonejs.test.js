/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const now = require('../../lib/now')
const querypack = require('@newrelic/nr-querypack')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')
let supported = testDriver.Matcher.withFeature('wrappableAddEventListener').and(notSafariWithSeleniumBug)

const init = {
  ajax: {
    deny_list: ['bam-test-1.nr-local.net']
  }
}

testDriver.test('capturing SPA interactions with zone.js', supported, function (t, browser, router) {
  t.plan(7)
  let testStartTime = now()

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/zonejs.html', { loader: 'spa', init }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let {body, query} = eventsResult
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
    .then(({query, body}) => {
      let receiptTime = now()
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.ok(interactionTree.end >= interactionTree.start, 'interaction end time should be >= start')
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      let fixup = receiptTime - query.rst
      let estimatedInteractionTimestamp = interactionTree.start + fixup
      t.ok(estimatedInteractionTimestamp > testStartTime, 'estimated ixn start after test start')
      t.ok(estimatedInteractionTimestamp < receiptTime, 'estimated ixn start before receipt time')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
