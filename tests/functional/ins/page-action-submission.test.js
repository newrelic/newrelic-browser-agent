/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const {validatePageActionData, fail} = require('./ins-internal-help.cjs')

const workingSendBeacon = testDriver.Matcher.withFeature('workingSendBeacon');


testDriver.test('PageAction submission', function (t, browser, router) {
  let url = router.assetURL('instrumented.html')

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(url)

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.safeEval('newrelic.addPageAction("DummyEvent", { free: "tacos" })')
      return router.expectIns()
    })
    .then(({request}) => {
      t.equal(request.method, 'POST', 'first PageAction submission is a POST')
      t.notOk(request.query.ins, 'query string does not include ins parameter')
      validatePageActionData(t, JSON.parse(request.body).ins, request.query)
      t.end()
    })
    .catch(fail(t))
})

testDriver.test('PageActions are retried when collector returns 429', function (t, browser, router) {
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
      router.scheduleReply('ins', {statusCode: 429})
      browser.safeEval('newrelic.addPageAction("exampleEvent", {param: "value"})')

      return router.expectIns()
    })
    .then(({request, reply}) => {
      t.equal(reply.statusCode, 429, 'server responded with 429')
      firstBody = JSON.parse(request.body)

      return router.expectIns()
    })
    .then(({request, reply}) => {
      const secondBody = JSON.parse(request.body)

      t.equal(reply.statusCode, 200, 'server responded with 200')
      t.deepEqual(secondBody, firstBody, 'post body in retry harvest should be the same as in the first harvest')
      t.equal(router.seenRequests.ins, 2, 'got two ins harvest requests')

      t.end()
    })
    .catch(fail(t))
})

testDriver.test('PageAction submission on final harvest', function (t, browser, router) {
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
    .then(() => {
      let insPromise = router.expectIns()

      let loadPromise = browser
        .safeEval('newrelic.addPageAction("DummyEvent", { free: "tacos" })')
        .get(url)

      return Promise.all([insPromise, loadPromise]).then(([ins]) => {
        return ins
      })
    })
    .then(({request}) => {
      let insData

      if (workingSendBeacon.match(browser)) {
        t.ok(request.body, 'second PageAction POST has non-empty body')
        insData = JSON.parse(request.body).ins
        t.equal(request.method, 'POST', 'final PageAction submission should be a POST')
        t.notOk(request.query.ins, 'query string does not include ins parameter')
        t.ok(insData, 'POST body is not empty')
      } else {
        insData = JSON.parse(request.query.ins)
        t.equal(request.method, 'GET', 'final PageAction submission should be a GET')
        t.ok(insData, 'has ins query string parameter')
      }

      validatePageActionData(t, insData, request.query)

      t.end()
    })
    .catch(fail(t))
})

testDriver.test('precedence', function (t, browser, router) {
  let url = router.assetURL('instrumented.html')

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      return browser.safeEval('newrelic.setCustomAttribute("browserHeight", 705)')
    })
    .then(() => {
      browser.safeEval('newrelic.addPageAction("MyEvent", { referrerUrl: "http://test.com", foo: {bar: "baz"} })').catch(fail(t))
      return router.expectIns()
    })
    .then(({request}) => {
      validatePageActionData(JSON.parse(request.body).ins, request.query)
      t.end()
    })
    .catch(fail(t))

  function validatePageActionData (pageActionData) {
    t.equal(pageActionData.length, 1, 'should have 1 event')

    let event = pageActionData[0]
    t.equal(event.actionName, 'MyEvent', 'event has correct action name')
    t.equal(event.eventType, 'PageAction', 'defaults has correct precedence')
    t.equal(event.browserHeight, 705, 'att has correct precedence')
    t.equal(event.referrerUrl, 'http://test.com', 'attributes has correct precedence')
    t.equal(event.foo, '{"bar":"baz"}', 'custom member of attributes passed through')
  }
})
