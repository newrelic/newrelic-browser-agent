/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

const asserters = testDriver.asserters
const supported = testDriver.Matcher.withFeature('addEventListener')

testDriver.test('interactions wait for external scripts to complete', supported, function (t, browser, router) {
  // load page and wait for initial load to complete
  loadAndWaitForLoad(router, browser, 'spa/external-scripts/lazy-loaded-script.html')
    .then(() => {
      // click, wait for global callback to be called, and route interaction to finish
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()
        .waitFor(asserters.jsCondition('window.globalCallbackDone', true), testDriver.timeout)
      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let i = querypack.decode(body && body.length ? body : query.e)[0]
      t.ok(i.start, 'start is present')
      t.ok(i.end, 'end is present')
      var duration = i.end - i.start
      t.ok(duration > 0 && duration < 1000, 'external script should not increase duration of the interaction')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('ajax call in loaded script extends interaction', supported, function (t, browser, router) {
  loadClickAndGetInteraction(router, browser, 'spa/external-scripts/script-with-ajax.html')
    .then(({ request: { query, body } }) => {
      let i = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(i.children.length, 1, 'should have one child for ajax')
      t.equal(i.children[0].type, 'ajax')

      t.ok(i.start, 'start is present')
      t.ok(i.end, 'end is present')
      t.ok(i.end >= i.children[0].end, 'interaction end should be same or higher than the delayed ajax')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('errored script', supported, function (t, browser, router) {
  loadClickAndGetInteraction(router, browser, 'spa/external-scripts/aborted-script.html')
    .then(({ request: { query, body } }) => {
      let i = querypack.decode(body && body.length ? body : query.e)[0]

      t.ok(i.start, 'start is present')
      t.ok(i.end, 'end is present')
      var duration = i.end - i.start
      t.ok(duration > 0 && duration < 1000, 'ajax in script should increase duration of the interaction')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

function loadAndWaitForLoad (router, browser, url) {
  let loadPromise = browser.safeGet(router.assetURL(url, { loader: 'spa' }))
    .waitForFeature('loaded')
  let rumPromise = router.expectRum()
  let eventPromise = router.expectEvents()

  return Promise.all([loadPromise, rumPromise, eventPromise])
}

function loadClickAndGetInteraction (router, browser, url) {
  return loadAndWaitForLoad(router, browser, url)
    .then(() => {
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()
      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
}
