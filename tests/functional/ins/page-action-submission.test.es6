/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import testDriver from '../../../tools/jil/index.es6'
let corsBrowsers = testDriver.Matcher.withFeature('cors')
let reliableFinalHarvest = testDriver.Matcher.withFeature('reliableFinalHarvest')
let xhrWithAddEventListener = testDriver.Matcher.withFeature('xhrWithAddEventListener')
import now from '../../lib/now.js'

testDriver.test('PageAction submission', corsBrowsers, function (t, browser, router) {
  let url = router.assetURL('instrumented.html')

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(url)

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.safeEval('newrelic.addPageAction("DummyEvent", { free: "tacos" })')
      return router.expectIns()
    })
    .then(({req, query, body}) => {
      t.equal(req.method, 'POST', 'first PageAction submission is a POST')
      t.notOk(query.ins, 'query string does not include ins parameter')
      validatePageActionData(t, JSON.parse(body).ins, query)
      t.end()
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('PageActions are retried when collector returns 429', corsBrowsers.and(xhrWithAddEventListener), function (t, browser, router) {
  let assetURL = router.assetURL('instrumented.html', {
    init: {
      ins: {
        harvestTimeSeconds: 2
      },
      harvest: {
        tooManyRequestsDelay: 10
      }
    }
  })

  let loadPromise = browser.get(assetURL)
  let rumPromise = router.expectRum()
  let firstBody

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      router.scheduleResponse('ins', 429)
      browser.safeEval('newrelic.addPageAction("exampleEvent", {param: "value"})')

      return router.expectIns()
    })
    .then((insResult) => {
      t.equal(insResult.res.statusCode, 429, 'server responded with 429')
      firstBody = JSON.parse(insResult.body)

      return router.expectIns()
    })
    .then((insResult) => {
      const secondBody = JSON.parse(insResult.body)

      t.equal(insResult.res.statusCode, 200, 'server responded with 200')
      t.deepEqual(secondBody, firstBody, 'post body in retry harvest should be the same as in the first harvest')
      t.equal(router.seenRequests.ins, 2, 'got two ins harvest requests')

      t.end()
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('PageAction submission on final harvest', corsBrowsers.and(reliableFinalHarvest), function (t, browser, router) {
  let url = router.assetURL('instrumented.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  })

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(url)

  Promise.all([rumPromise, loadPromise])
    .then(({req, query, body}) => {
      let insPromise = router.expectIns()

      let loadPromise = browser
        .safeEval('newrelic.addPageAction("DummyEvent", { free: "tacos" })')
        .get(url)

      return Promise.all([insPromise, loadPromise]).then(([ins, load]) => {
        return ins
      })
    })
    .then(({req, query, body}) => {
      let insData
      let sendBeaconBrowsers = testDriver.Matcher.withFeature('sendBeacon')
      let brokenBeaconBrowsers = testDriver.Matcher.withFeature('brokenSendBeacon')

      if ((sendBeaconBrowsers.match(browser) && !brokenBeaconBrowsers.match(browser))) {
        t.ok(body, 'second PageAction POST has non-empty body')
        insData = JSON.parse(body).ins
        t.equal(req.method, 'POST', 'final PageAction submission should be a POST')
        t.notOk(query.ins, 'query string does not include ins parameter')
        t.ok(insData, 'POST body is not empty')
      } else {
        insData = JSON.parse(query.ins)
        t.equal(req.method, 'GET', 'final PageAction submission should be a GET')
        t.ok(insData, 'has ins query string parameter')
      }

      validatePageActionData(t, insData, query)

      t.end()
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})

function validatePageActionData (t, pageActionData, query) {
  let receiptTime = now()

  t.equal(pageActionData.length, 1, 'should have 1 event')

  let event = pageActionData[0]
  t.equal(event.actionName, 'DummyEvent', 'event has correct action name')
  t.equal(event.free, 'tacos', 'event has free tacos')

  let relativeHarvestTime = query.rst
  let estimatedPageLoad = receiptTime - relativeHarvestTime
  let eventTimeSinceLoad = event.timeSinceLoad * 1000
  let estimatedEventTime = eventTimeSinceLoad + estimatedPageLoad

  t.ok(relativeHarvestTime > eventTimeSinceLoad, 'harvest time (' + relativeHarvestTime + ') should always be bigger than event time (' + eventTimeSinceLoad + ')')
  t.ok(estimatedEventTime < receiptTime, 'estimated event time (' + estimatedEventTime + ') < receipt time (' + receiptTime + ')')
}

testDriver.test('precedence', corsBrowsers.and(reliableFinalHarvest), function (t, browser, router) {
  let url = router.assetURL('instrumented.html')

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      return browser.safeEval('newrelic.setCustomAttribute("browserHeight", 705)')
    })
    .then(() => {
      browser.safeEval('newrelic.addPageAction("MyEvent", { referrerUrl: "http://test.com", foo: {bar: "baz"} })').catch(fail)
      return router.expectIns()
    })
    .then(({req, query, body}) => {
      validatePageActionData(JSON.parse(body).ins, query)
      t.end()
    })
    .catch(fail)

  function validatePageActionData (pageActionData, query) {
    t.equal(pageActionData.length, 1, 'should have 1 event')

    let event = pageActionData[0]
    t.equal(event.actionName, 'MyEvent', 'event has correct action name')
    t.equal(event.eventType, 'PageAction', 'defaults has correct precedence')
    t.equal(event.browserHeight, 705, 'att has correct precedence')
    t.equal(event.referrerUrl, 'http://test.com', 'attributes has correct precedence')
    t.equal(event.foo, '{"bar":"baz"}', 'custom member of attributes passed through')
  }

  function fail (e) {
    t.error(e)
    t.end()
  }
})
