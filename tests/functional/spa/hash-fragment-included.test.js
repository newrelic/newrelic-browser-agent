/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

let supported = testDriver.Matcher.withFeature('addEventListener')

testDriver.test('spa page urls include the hash fragment', supported, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/xhr.html', { loader: 'spa' }))
    .waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      // make sure the newURL has the hash change
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.ok(/#\d/.test(interactionTree.newURL), 'the url should contain the hash fragment')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
