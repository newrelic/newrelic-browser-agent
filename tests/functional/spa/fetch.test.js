/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const now = require('../../lib/now')
const querypack = require('@newrelic/nr-querypack')

let supported = testDriver.Matcher.withFeature('fetch')

testDriver.test('capturing fetch in SPA interactions', supported, function (t, browser, router) {
  let testStartTime = now()

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/fetch.html', { loader: 'spa' })).waitForFeature('loaded')

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([{ request: eventsResult }]) => {
      let { body, query } = eventsResult

      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')

      let eventPromise = router.expectEvents()
      let domPromise = browser
        .elementByCssSelector('body')
        .click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({ request: { query, body } }) => {
      let receiptTime = now()
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.ok(interactionTree.id, 'interaction has id attribute')
      t.ok(interactionTree.nodeId, 'interaction has nodeId attribute')
      t.ok(interactionTree.end >= interactionTree.start, 'interaction end time should be >= start')
      t.ok(interactionTree.callbackEnd >= interactionTree.start, 'interaaction callback end should be >= interaction start')
      t.ok(interactionTree.callbackEnd <= interactionTree.end, 'interaction callback end should be <= interaction end')
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      var fetch = interactionTree.children[0]

      t.ok(fetch.nodeId, 'has nodeId attribute')
      t.equal(fetch.type, 'ajax', 'should be an ajax node')
      t.equal(fetch.children.length, 0, 'should not have nested children')
      t.equal(fetch.method, 'POST', 'should be a POST request')
      t.equal(fetch.status, 200, 'should have a 200 status')
      t.equal(fetch.domain.split(':')[0], 'bam-test-1.nr-local.net', 'should have a correct hostname')
      var port = +fetch.domain.split(':')[1]
      t.ok(port > 1000 && port < 100000, 'port should be in expected range')
      t.equal(fetch.requestBodySize, 3, 'should have correct requestBodySize')
      t.equal(fetch.responseBodySize, 3, 'should have correct responseBodySize')
      t.equal(fetch.requestedWith, 'fetch', 'should indicate it was requested with fetch')

      let fixup = receiptTime - query.rst
      let estimatedInteractionTimestamp = interactionTree.start + fixup
      t.ok(estimatedInteractionTimestamp > testStartTime, 'estimated ixn start after test start')
      t.ok(estimatedInteractionTimestamp < receiptTime, 'estimated ixn start before receipt time')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('response size', supported, function (t, browser, router) {
  var testCases = [
    {
      name: 'with request that returns content-length header',
      responseBodySize: 10,
      asset: 'spa/fetch-simple.html'
    },
    {
      name: 'with request without content-length header',
      responseBodySize: 0,
      asset: 'spa/fetch-chunked.html'
    }
  ]

  testCases.forEach(function (testCase) {
    t.test(testCase.name, function (t) {
      let loadPromise = browser.safeGet(router.assetURL(testCase.asset, { loader: 'spa' })).waitForFeature('loaded')
      let eventsPromise = router.expectEvents()
      let rumPromise = router.expectRum()

      Promise.all([rumPromise, loadPromise, eventsPromise])
        .then(() => {
          let eventPromise = router.expectEvents()
          let domPromise = browser
            .elementByCssSelector('body')
            .click()

          return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
            return eventData
          })
        })
        .then(({ request: { query, body } }) => {
          let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
          var fetchNode = interactionTree.children.find((node) => node.type === 'ajax')
          t.equal(fetchNode.responseBodySize, testCase.responseBodySize, 'should have correct responseBodySize')
          t.end()
        })
        .catch(fail)

      function fail (err) {
        t.error(err, 'unexpected error')
        t.end()
      }
    })
  })
})
