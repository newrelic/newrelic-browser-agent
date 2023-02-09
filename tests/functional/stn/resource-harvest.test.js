/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('session trace resources', supported, function (t, browser, router) {
  let assetURL = router.assetURL('stn/instrumented.html', {
    loader: 'full',
    init: {
      session_trace: {
        harvestTimeSeconds: 5
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

    // trigger an XHR call after
    var clickPromise = browser
      .elementByCssSelector('body')
      .click()

    resourcePromise = router.expectResources()

    return Promise.all([resourcePromise, clickPromise])
  }).then(([result]) => {
    const body = result.body

    t.equal(router.seenRequests.resources, 2, 'got two harvest requests')
    t.equal(result.res.statusCode, 200, 'server responded with 200')

    const parsed = JSON.parse(body).res
    const harvestBody = parsed
    const resources = harvestBody.filter(function (node) { return node.t === 'resource' })

    t.ok(resources.length > 1, 'there is at least one resource node')

    var url = 'http://' + router.router.assetServer.host + ':' + router.router.assetServer.port + '/json'
    const found = resources.find(element => element.o === url)
    t.ok(!!found, 'expected resource was found')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
