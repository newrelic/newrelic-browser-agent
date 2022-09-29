/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('session trace resources', supported, function (t, browser, router) {
  let assetURL = router.assetURL('stn/ajax-disabled.html', {
    loader: 'full',
    init: {
      session_trace: {
        harvestTimeSeconds: 5
      },
      ajax: {
        enabled: false
      },
      page_view_timing: {
        enabled: false
      }
    }
  })

  let loadPromise = browser.safeGet(assetURL)
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()

  Promise.all([resourcePromise, loadPromise, rumPromise]).then(([result]) => {
    t.equal(result.res.statusCode, 200, 'server responded with 200')

    const body = result.body
    const harvestBody = JSON.parse(body).res

    // trigger an XHR call after
    var clickPromise = browser
      .elementByCssSelector('body')
      .click()

    resourcePromise = router.expectResources()

    return Promise.all([resourcePromise, clickPromise])
  })
  .then(([result]) => {
    t.equal(router.seenRequests.resources, 2, 'got two harvest requests')
    t.equal(result.res.statusCode, 200, 'server responded with 200')

    const body = result.body
    const harvestBody = JSON.parse(body).res
    const loadNodes = harvestBody.filter(function (node) { return node.t === 'event' && node.n === 'load' || node.n === 'readystatechange' })
    t.notOk(loadNodes.length > 0, 'XMLHttpRequest nodes not captured when ajax instrumentation is disabled')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
