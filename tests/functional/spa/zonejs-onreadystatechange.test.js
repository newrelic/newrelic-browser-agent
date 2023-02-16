/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')
let supported = testDriver.Matcher.withFeature('wrappableAddEventListener').and(notSafariWithSeleniumBug)

testDriver.test('onreadystatechange only called once with zone.js', supported, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/zonejs-on-ready-state-change.html', { loader: 'spa', init: { ajax: { deny_list: ['nr-local.net'] } } }))
    .waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      const interactionAttr = interactionTree.children.find(x => x.key === 'counts')

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.ok(!!interactionAttr, 'expect counts child from API')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')
      t.equal(interactionAttr.type, 'stringAttribute')
      // the counts custom attribute is an array of number of times onreadystatechage is called
      // for each state.  state 1 and 3 may be called more than once, 2 and 4 should be called
      // exactly once
      const counts = JSON.parse(interactionTree.children[0].value)
      counts.forEach((c, i) => {
        if (i && i % 2 === 0) t.ok(c === 1, 'state 2 and 4 should be called exactly once')
        else t.ok(c >= 0, ' state 1 and 3 may be called more than once')
      })
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
