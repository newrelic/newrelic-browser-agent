/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { testAjaxTimeSlicesRequest } = require('../../../tools/testing-server/utils/expect-tests')

const asserters = testDriver.asserters

var supported = testDriver.Matcher.withFeature('reliableUnloadEvent')
  .exclude('ie@<9') // need addEventListener too

testDriver.test('slow XHR submission should not delay next page load', supported, function (t, browser, router) {
  let bamServerResponded = false

  t.plan(1)

  // make the router's response artificially slow
  router.scheduleReply('bamServer', {
    test: testAjaxTimeSlicesRequest,
    delay: 20000
  })
  router.scheduleReply('bamServer', {
    test: testAjaxTimeSlicesRequest,
    delay: 20000
  })
  router.expectErrors().then(() => {
    bamServerResponded = true
  }).catch(() => {})

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('xhr.html', {
    testId: router.testId,
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      return browser
        .waitFor(asserters.jsCondition('window.xhrDone'))
        .get(router.assetURL('load-indicator.html'))
        .waitFor(asserters.jsCondition('window.loadFired'))
    })
    .then(() => {
      t.notok(bamServerResponded, 'next page should have loaded before bam server responded')
    })
    .catch(fail)

  function fail (err) {
    t.error(err, 'unexpected error')
    t.end()
  }
})
