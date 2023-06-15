/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { validatePageActionData, fail } = require('./ins-internal-help.cjs')
const { testInsRequest } = require('../../../tools/testing-server/utils/expect-tests')

const workingSendBeacon = testDriver.Matcher.withFeature('workingSendBeacon')

testDriver.test('PageAction submission', function (t, browser, router) {
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

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.safeEval('newrelic.addPageAction("DummyEvent", { free: "tacos" })')
      return router.expectIns()
    })
    .then(({ request }) => {
      let insData
      if (request.body) {
        insData = request.body.ins
      } else {
        insData = JSON.parse(request.query.ins)
      }

      validatePageActionData(t, insData, request.query)
      t.end()
    })
    .catch(fail(t))
})

testDriver.test('PageAction submission on final harvest', function (t, browser, router) {
  let assetURL = router.assetURL('instrumented.html', {
    init: {
      ins: {
        harvestTimeSeconds: 2
      },
      page_view_timing: {
        enabled: false
      },
      harvest: {
        tooManyRequestsDelay: 10
      }
    }
  })

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      let insPromise = router.expectIns()

      let loadPromise = browser
        .safeEval('newrelic.addPageAction("DummyEvent", { free: "tacos" })')
        .get(assetURL)

      return Promise.all([insPromise, loadPromise]).then(([ins]) => {
        return ins
      })
    })
    .then(({ request }) => {
      let insData

      if (request.body) {
        insData = request.body.ins
      } else {
        insData = JSON.parse(request.query.ins)
      }

      validatePageActionData(t, insData, request.query)

      t.end()
    })
    .catch(fail(t))
})

testDriver.test('precedence', function (t, browser, router) {
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

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      const insPromise = router.expectIns()
      const apiPromise = browser
        .safeEval('newrelic.setCustomAttribute("browserHeight", 705)')
        .safeEval('newrelic.addPageAction("MyEvent", { referrerUrl: "http://test.com", foo: {bar: "baz"} })')

      return Promise.all([insPromise, apiPromise])
    })
    .then(([{ request }]) => {
      let insData
      if (request.body) {
        insData = request.body.ins
      } else {
        insData = JSON.parse(request.query.ins)
      }

      validatePageActionData(insData)
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
