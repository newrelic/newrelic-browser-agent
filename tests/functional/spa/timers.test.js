/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
const testDriver = require('../../../tools/jil')
const querypack = require('@newrelic/nr-querypack')

const supported = testDriver.Matcher.withFeature('addEventListener')

testDriver.test('incorrect timer', supported, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/incorrect-timer.html', { loader: 'spa' }))
    .waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()
      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.category, 'Route change', 'got route change harvest call')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
