/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

let supported = testDriver.Matcher.withFeature('addEventListener')
// jQuery and Angular don't work on Firefox 5
let supportedWithoutFirefox = supported.exclude('firefox@5')

runTest('basic', 'spa/jsonp/basic.html', supported)
runTest('jQuery', 'spa/jsonp/jquery.html', supportedWithoutFirefox)
runTest('MooTools', 'spa/jsonp/mootools.html', supported)
runTest('Angular v1.x', 'spa/jsonp/angular1.html', supportedWithoutFirefox)

function runTest (title, htmlPage, supported) {
  testDriver.test(title, supported, function (t, browser, router) {
    t.plan(16)

    waitForPageLoad(browser, router, htmlPage)
      .then(() => {
        return clickPageAndWaitForEvents(browser, router)
      })
      .then(({ request: { query, body } }) => {
        let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
        t.ok(interactionTree.end >= interactionTree.start, 'interaction end time should be >= start')
        t.ok(interactionTree.callbackEnd >= interactionTree.start, 'interaaction callback end should be >= interaction start')
        t.ok(interactionTree.callbackEnd <= interactionTree.end, 'interaction callback end should be <= interaction end')
        t.equal(interactionTree.children.length, 1, 'expected one child node')

        var xhr = interactionTree.children[0]

        t.equal(xhr.type, 'ajax', 'should be an ajax node')
        t.equal(xhr.method, 'GET', 'should be a GET request')
        t.equal(xhr.status, 200, 'should have a 200 status')
        t.equal(xhr.domain.split(':')[0], 'bam-test-1.nr-local.net', 'should have a correct hostname')
        var port = +xhr.domain.split(':')[1]
        t.ok(port > 1000 && port < 100000, 'port should be in expected range')
        t.equal(xhr.requestBodySize, 0, 'should have correct requestBodySize')
        t.equal(xhr.responseBodySize, 0, 'should have correct responseBodySize')
        t.equal(xhr.requestedWith, 'JSONP', 'should indicate it was requested with JSONP')
        t.equal(xhr.children.length, 1, 'expected one child node')

        var tracer = xhr.children[0]
        t.equal(tracer.type, 'customTracer', 'child must be a custom tracer')
        t.equal(tracer.name, 'tacoTimer', 'tracer should be named tacoTimer')
        t.equal(tracer.children.length, 0, 'should not have nested children')
      })
      .catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}

testDriver.test('JSONP on initial page load', supported, function (t, browser, router) {
  t.plan(16)

  waitForPageLoad(browser, router, 'spa/jsonp/load.html')
    .then((result) => {
      let query, body
      ({ query, body } = result[1].request)

      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.ok(interactionTree.end >= interactionTree.start, 'interaction end time should be >= start')
      t.ok(interactionTree.callbackEnd >= interactionTree.start, 'interaaction callback end should be >= interaction start')
      t.ok(interactionTree.callbackEnd <= interactionTree.end, 'interaction callback end should be <= interaction end')
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      var xhr = interactionTree.children[0]

      t.equal(xhr.type, 'ajax', 'should be an ajax node')
      t.equal(xhr.method, 'GET', 'should be a GET request')
      t.equal(xhr.status, 200, 'should have a 200 status')
      t.equal(xhr.domain.split(':')[0], 'bam-test-1.nr-local.net', 'should have a correct hostname')
      var port = +xhr.domain.split(':')[1]
      t.ok(port > 1000 && port < 100000, 'port should be in expected range')
      t.equal(xhr.requestBodySize, 0, 'should have correct requestBodySize')
      t.equal(xhr.responseBodySize, 0, 'should have correct responseBodySize')
      t.equal(xhr.requestedWith, 'JSONP', 'should indicate it was requested with JSONP')
      t.comment('second: ' + xhr.children.length)
      t.ok(xhr.children.length >= 1, 'expected at least one child node')

      var tracer = xhr.children.find(function (node) {
        return node.type === 'customTracer'
      })

      t.ok(tracer, 'xhr must have a child node of tracer')
      t.equal(tracer.name, 'tacoTimer', 'tracer should be named tacoTimer')
      t.equal(tracer.children.length, 0, 'should not have nested children')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('two JSONP events', supported, function (t, browser, router) {
  t.plan(14)

  waitForPageLoad(browser, router, 'spa/jsonp/duo.html')
    .then(() => {
      return clickPageAndWaitForEvents(browser, router)
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.ok(interactionTree.end >= interactionTree.start, 'interaction end time should be >= start')
      t.ok(interactionTree.callbackEnd >= interactionTree.start, 'interaaction callback end should be >= interaction start')
      t.ok(interactionTree.callbackEnd <= interactionTree.end, 'interaction callback end should be <= interaction end')
      t.equal(interactionTree.children.length, 2, 'expected two child nodes')

      // First jsonp
      var firstJsonp = interactionTree.children[0]
      t.equal(firstJsonp.type, 'ajax', 'should be an ajax node')
      t.equal(firstJsonp.children.length, 1, 'expected one child node')
      var tracerOne = firstJsonp.children[0]
      t.equal(tracerOne.type, 'customTracer', 'child must be a custom tracer')
      t.ok(tracerOne.name.match(/tacoTimer/), 'tracer should be named tacoTimer')
      t.equal(tracerOne.children.length, 0, 'should not have nested children')

      // Second jsonp
      var secondJsonp = interactionTree.children[1]
      t.equal(secondJsonp.type, 'ajax', 'should be an ajax node')
      t.equal(secondJsonp.children.length, 1, 'expected one child node')
      var tracerTwo = secondJsonp.children[0]
      t.equal(tracerTwo.type, 'customTracer', 'child must be a custom tracer')
      t.ok(tracerTwo.name.match(/tacoTimer/), 'tracer should be named tacoTimer')
      t.equal(tracerTwo.children.length, 0, 'should not have nested children')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('JSONP with non-JSON response', supported, function (t, browser, router) {
  t.plan(4)

  waitForPageLoad(browser, router, 'spa/jsonp/plaintext.html')
    .then(() => {
      return clickPageAndWaitForEvents(browser, router)
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      var xhr = interactionTree.children[0]

      t.equal(xhr.status, 200, 'should have a 200 status')
      t.equal(xhr.requestBodySize, 0, 'should have correct requestBodySize')
      t.equal(xhr.responseBodySize, 0, 'should have correct responseBodySize')
      t.equal(xhr.requestedWith, 'JSONP', 'should indicate it was requested with JSONP')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('JSONP with error', supported, function (t, browser, router) {
  t.plan(5)

  waitForPageLoad(browser, router, 'spa/jsonp/error.html')
    .then(() => {
      return clickPageAndWaitForEvents(browser, router)
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      var xhr = interactionTree.children[0]
      t.ok(xhr, 'xhr node should exist')

      t.equal(xhr.status, 0, 'should have a 0 status')
      t.equal(xhr.requestBodySize, 0, 'should have correct requestBodySize')
      t.equal(xhr.responseBodySize, 0, 'should have correct responseBodySize')
      t.equal(xhr.requestedWith, 'JSONP', 'should indicate it was requested with JSONP')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

/**
 * startTimestamp = absolute timestamp of when the interation happened
 * node.start = relative new-jsonp time from page load time
 * node.end = same as node.jsEnd
 * node.jsEnd = relative jsonp-end time from page load time
 * node.callbackDuration = sync duration of the callback
 */
testDriver.test('JSONP timings', supported, function (t, browser, router) {
  t.plan(6)

  waitForPageLoad(browser, router, 'spa/jsonp/timing.html')
    .then(() => {
      return clickPageAndWaitForEvents(browser, router)
    })
    .then(({ request: { query, body } }) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      var xhr = interactionTree.children[0]
      t.ok(xhr, 'xhr node should exist')

      var syncTime = xhr.callbackDuration
      var totalDuration = xhr.end - xhr.start
      var asyncTime = totalDuration - syncTime

      t.ok(asyncTime >= 1000, 'asyncTime is bigger than 1s')
      t.ok(syncTime >= 1000, 'syncTime is bigger than 1s')
      t.ok(totalDuration > asyncTime, 'total duration is bigger than async time')
      t.ok(totalDuration > syncTime, 'total duration is bigger than sync time')
      t.ok(xhr.end > xhr.start, 'end is bigger than start')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

function waitForPageLoad (browser, router, urlPath) {
  return Promise.all([
    router.expectRum(),
    router.expectEvents(),
    browser.safeGet(router.assetURL(urlPath, { loader: 'spa', init: { session_trace: { enabled: false } } }))
      .waitForFeature('loaded')
  ])
}

function clickPageAndWaitForEvents (browser, router) {
  return Promise.all([
    router.expectEvents(),
    browser.elementByCssSelector('body').click()
  ]).then(([eventData, domData]) => {
    return eventData
  })
}
