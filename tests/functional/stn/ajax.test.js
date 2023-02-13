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

  let loadPromise = browser.safeGet(assetURL).waitForFeature('loaded')
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()

  Promise.all([resourcePromise, loadPromise, rumPromise]).then(([result]) => {
    t.equal(result.reply.statusCode, 200, 'server responded with 200')

    // trigger an XHR call after
    var clickPromise = browser
      .elementByCssSelector('body')
      .click()

    resourcePromise = router.expectResources()

    return Promise.all([resourcePromise, clickPromise])
  })
    .then(([result]) => {
      t.equal(result.reply.statusCode, 200, 'server responded with 200')

      const body = result.request.body
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

testDriver.test('session trace ajax deny list', supported, function (t, browser, router) {
  let assetURL = router.assetURL('stn/ajax-disabled.html', {
    loader: 'full',
    init: {
      session_trace: {
        harvestTimeSeconds: 5
      },
      ajax: {
        harvestTimeSeconds: 2,
        enabled: true,
        deny_list: [router.testServer.assetServer.host]
      },
      page_view_timing: {
        enabled: false
      }
    }
  })

  let loadPromise = browser.safeGet(assetURL).waitForFeature('loaded')
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()
  const ajaxPromise = router.expectAjaxTimeSlices(8000).then(() => {
    t.fail('Should not have seen the ajax event')
  }).catch(() => {})

  Promise.all([resourcePromise, ajaxPromise, loadPromise, rumPromise]).then(([result]) => {
    t.equal(result.reply.statusCode, 200, 'server responded with 200')

    // trigger an XHR call after
    var clickPromise = browser
      .elementByCssSelector('body')
      .click()

    resourcePromise = router.expectResources()

    return Promise.all([resourcePromise, clickPromise])
  })
    .then(([result]) => {
      t.equal(result.reply.statusCode, 200, 'server responded with 200')

      const body = result.request.body
      const harvestBody = JSON.parse(body).res
      const loadNodes = harvestBody.filter(function (node) { return node.t === 'ajax' })
      t.ok(loadNodes.length > 0, 'XMLHttpRequest nodes captured even with ajax deny list')

      t.end()
    }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
