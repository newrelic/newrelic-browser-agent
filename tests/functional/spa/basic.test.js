/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const now = require('../../lib/now')
const querypack = require('@newrelic/nr-querypack')

let supported = testDriver.Matcher.withFeature('addEventListener')
const notIE = testDriver.Matcher.withFeature('notInternetExplorer')

testDriver.test('capturing SPA interactions', supported, function (t, browser, router) {
  t.plan(22)
  let testStartTime = now()

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectInteractionEvents()
  const asset = router.assetURL('spa/xhr.html', { loader: 'spa', init: { session_trace: { enabled: false } } })
  let loadPromise = browser.safeGet(asset).waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult

      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 0, 'expect no child nodes')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')

      let eventPromise = router.expectInteractionEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let receiptTime = now()
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.ok(interactionTree.id != null, 'interaction has id')
      t.ok(interactionTree.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
        'interaction id is in uuid format')
      t.ok(interactionTree.nodeId, 'interaction has nodeId attribute')

      t.ok(interactionTree.end >= interactionTree.start, 'interaction end time should be >= start')
      t.ok(interactionTree.callbackEnd >= interactionTree.start, 'interaaction callback end should be >= interaction start')
      t.ok(interactionTree.callbackEnd <= interactionTree.end, 'interaction callback end should be <= interaction end')
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      var xhr = interactionTree.children[0]

      t.ok(xhr.nodeId, 'node has nodeId attribute')
      t.equal(xhr.type, 'ajax', 'should be an ajax node')
      t.equal(xhr.children.length, 0, 'should not have nested children')
      t.equal(xhr.method, 'POST', 'should be a POST request')
      t.equal(xhr.status, 200, 'should have a 200 status')
      t.equal(xhr.domain.split(':')[0], 'bam-test-1.nr-local.net', 'should have a correct hostname')
      var port = +xhr.domain.split(':')[1]
      t.ok(port > 1000 && port < 100000, 'port should be in expected range')
      t.equal(xhr.requestBodySize, 3, 'should have correct requestBodySize')
      t.equal(xhr.responseBodySize, 3, 'should have correct responseBodySize')
      t.equal(xhr.requestedWith, 'XMLHttpRequest', 'should indicate it was requested with xhr')

      let fixup = receiptTime - query.rst
      let estimatedInteractionTimestamp = interactionTree.start + fixup
      t.ok(estimatedInteractionTimestamp > testStartTime, 'estimated ixn start after test start')
      t.ok(estimatedInteractionTimestamp < receiptTime, 'estimated ixn start before receipt time')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('capturing SPA interactions using loader_config data', supported, function (t, browser, router) {
  t.plan(22)
  let testStartTime = now()

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectInteractionEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/xhr.html', { loader: 'spa', injectUpdatedLoaderConfig: true, init: { session_trace: { enabled: false } } })).waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult

      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 0, 'expect no child nodes')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')

      let eventPromise = router.expectInteractionEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let receiptTime = now()
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.ok(interactionTree.id != null, 'interaction has id')
      t.ok(interactionTree.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
        'interaction id is in uuid format')
      t.ok(interactionTree.nodeId, 'interaction has nodeId attribute')

      t.ok(interactionTree.end >= interactionTree.start, 'interaction end time should be >= start')
      t.ok(interactionTree.callbackEnd >= interactionTree.start, 'interaaction callback end should be >= interaction start')
      t.ok(interactionTree.callbackEnd <= interactionTree.end, 'interaction callback end should be <= interaction end')
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      var xhr = interactionTree.children[0]

      t.ok(xhr.nodeId, 'node has nodeId attribute')
      t.equal(xhr.type, 'ajax', 'should be an ajax node')
      t.equal(xhr.children.length, 0, 'should not have nested children')
      t.equal(xhr.method, 'POST', 'should be a POST request')
      t.equal(xhr.status, 200, 'should have a 200 status')
      t.equal(xhr.domain.split(':')[0], 'bam-test-1.nr-local.net', 'should have a correct hostname')
      var port = +xhr.domain.split(':')[1]
      t.ok(port > 1000 && port < 100000, 'port should be in expected range')
      t.equal(xhr.requestBodySize, 3, 'should have correct requestBodySize')
      t.equal(xhr.responseBodySize, 3, 'should have correct responseBodySize')
      t.equal(xhr.requestedWith, 'XMLHttpRequest', 'should indicate it was requested with xhr')

      let fixup = receiptTime - query.rst
      let estimatedInteractionTimestamp = interactionTree.start + fixup
      t.ok(estimatedInteractionTimestamp > testStartTime, 'estimated ixn start after test start')
      t.ok(estimatedInteractionTimestamp < receiptTime, 'estimated ixn start before receipt time')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('child nodes in SPA interaction does not exceed set limit', supported, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectInteractionEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/fetch-exceed-max-spa-nodes.html', { loader: 'spa' })).waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult

      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 0, 'expect no child nodes')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')

      let eventPromise = router.expectInteractionEvents()
      let domPromise = browser
        .elementByCssSelector('body')
        .click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.ok(interactionTree.children.length <= 128, 'interaction should have no more than 128 child nodes')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('promise wrapper should support instanceof comparison', notIE, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.safeGet(router.assetURL('promise-instanceof.html', { loader: 'spa' }))

  Promise.all([rumPromise, loadPromise])
    .then(async () => {
      await browser.safeEval('window.isNewPromise', (err, res) => {
        t.notOk(err, 'should not get an error')
        t.ok(res, 'new Promise is an instance of global Promise')
      })
      await browser.safeEval('window.isPromiseResolve', (err, res) => {
        t.notOk(err, 'should not get an error')
        t.ok(res, 'static Promise methods return is instanceof global Promise')
      })
      await browser.safeEval('window.isFetchPromise', (err, res) => {
        t.notOk(err, 'should not get an error')
        t.ok(res, 'fetch returned promise is an instance of global Promise')
      })
      await browser.safeEval('window.isAsyncPromise', (err, res) => {
        t.notOk(err, 'should not get an error')
        t.ok(res, 'async function returned promise is an instance of global Promise')
      })
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
