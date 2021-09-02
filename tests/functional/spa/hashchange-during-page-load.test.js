/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

let supported = testDriver.Matcher.withFeature('addEventListener')

testDriver.test('', supported, function (t, browser, router) {
  t.plan(2)
  let targetUrl = router.assetURL('spa/hashchange-during-page-load.html', { loader: 'spa' })

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(targetUrl)

  router.timeout = 5000

  // This promise should never be fulfilled, because we should only get one
  // /events submission, for the initial page load.
  router.expectEvents()
    .then((eventsResult) => {
      let {body, query} = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.fail('got second /events submission with interaction of type ' + interactionTree.trigger)
    })
    .catch(() => {
      t.ok('did not get second /events submission')
    })

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let {body, query} = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
