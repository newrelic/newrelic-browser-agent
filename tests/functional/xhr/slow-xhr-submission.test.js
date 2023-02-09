/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

const asserters = testDriver.asserters

var supported = testDriver.Matcher.withFeature('reliableUnloadEvent').exclude('ie@<9') // need addEventListener too

testDriver.test('slow XHR submission should not delay next page load', supported, function (t, browser, router) {
  let routerResponded = false
  let oldFirefox = browser.match('firefox@<31')

  t.plan(oldFirefox ? 1 : 2)

  // make the router's response artificially slow
  router.responders['GET /jserrors/1/{key}'] = handleErrors
  router.responders['POST /jserrors/1/{key}'] = handleErrors

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(
    router.assetURL('xhr.html', {
      testId: router.testID,
      init: {
        page_view_timing: {
          enabled: false
        },
        metrics: {
          enabled: false
        }
      }
    })
  )

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      let navigatePromise = browser
        .waitFor(asserters.jsCondition('window.xhrDone'))
        .safeGet(router.assetURL('load-indicator.html'))
        .waitFor(asserters.jsCondition('window.loadFired'))

      if (browser.match('firefox@<31')) {
        return navigatePromise
      } else {
        return Promise.all([navigatePromise, router.expectXHRMetrics()]).then(([feat, err]) => err)
      }
    })
    .then(() => {
      t.notok(routerResponded, 'next page should have loaded before router responded')
    })
    .catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }

  function handleErrors (req, res, handle) {
    setTimeout(() => {
      res.writeHead(200)
      res.end()
      routerResponded = true
      t.ok(true, 'router finished sending response')
    }, 5000)
  }
})
