/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../../tools/jil/index')
const supported = testDriver.Matcher.withFeature('es6')

const opts = {
  init: {
    ins: {
      harvestTimeSeconds: 2
    }
  }
}

testDriver.test('NPM PageActions are sent via addPageAction from core module', supported, function (t, browser, router) {
  let loadPromise = browser.safeGet(router.assetURL('modular/page-action/enabled.html', opts))
  let pageActionPromise = router.expectIns()

  Promise.all([loadPromise, pageActionPromise])
    .then(([loadResult, pageActionResult]) => {
      const {query, body} = pageActionResult
      const pageActionData = body && JSON.parse(body).ins
      
      validatePageActionData(t, pageActionData, query)
      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

function validatePageActionData (t, pageActionData, query) {
  // imitating browser-agent-core/common/timing/now.js
  let receiptTime = Math.round(performance.now())

  t.equal(pageActionData.length, 1, 'should have 1 event')

  let event = pageActionData[0]
  t.equal(event.actionName, 'Event', 'event has correct action name')
  t.equal(event.attr, 'example', 'event has correct attributes')

  let relativeHarvestTime = query.rst
  let estimatedPageLoad = receiptTime - relativeHarvestTime
  let eventTimeSinceLoad = event.timeSinceLoad * 1000
  let estimatedEventTime = eventTimeSinceLoad + estimatedPageLoad

  t.ok(relativeHarvestTime > eventTimeSinceLoad, 'harvest time (' + relativeHarvestTime + ') should always be bigger than event time (' + eventTimeSinceLoad + ')')
  t.ok(estimatedEventTime < receiptTime, 'estimated event time (' + estimatedEventTime + ') < receipt time (' + receiptTime + ')')
}

testDriver.test('PageActions are sent from multiple instances to isolated targets', supported, function (t, browser, router) {
  t.plan(2)

  let loadPromise = browser.safeGet(router.assetURL('modular/page-action/multiple-instances.html', opts))
  let agent1Promise = router.expectIns(1)
  let agent2Promise = router.expectIns(2)

  Promise.all([loadPromise, agent1Promise, agent2Promise])
    .then(([loadResult, ...pageActionsResult]) => {
      pageActionsResult.forEach(pageActionResult => {
        const { body } = pageActionResult
        const pageActionData = body && JSON.parse(body).ins
        const event = pageActionData[0]

        if (event) {
          t.equal('agent' + pageActionResult.query.a, event.actionName, 'event contains the correct actionName')
        } else {
          fail('No PageAction data was received.')
        }
      })
      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})

testDriver.test('PageActions are not sent if agent is not initialized', supported, function (t, browser, router) {
  setRouterTimeout(5000)
  t.plan(1)

  let loadPromise = browser.setAsyncScriptTimeout(5000).safeGet(router.assetURL('modular/page-action/invalid-not-initialized.html', opts))
  let pageActionPromise = router.expectIns()

  Promise.all([loadPromise, pageActionPromise])
    .then(([response]) => {
      t.error('should not receive PageAction promise')
      t.end()
    })
    .catch(fail)
    .finally(() => setRouterTimeout(32000))

  function fail() {
    t.ok(true, 'PageAction Promise did not execute because agent was not initialized')
    t.end()
  }

  function setRouterTimeout(ms) {
    router.timeout = router.router.timeout = ms
  }
})

testDriver.test('PageActions are not sent if feature is disabled', supported, function (t, browser, router) {
  setRouterTimeout(5000)
  t.plan(1)

  let loadPromise = browser.setAsyncScriptTimeout(5000).safeGet(router.assetURL('modular/page-action/disabled.html', opts))
  let pageActionPromise = router.expectIns()

  Promise.all([loadPromise, pageActionPromise])
    .then(([response]) => {
      t.error('should not receive a PageAction harvest')
      t.end()
    })
    .catch(fail)
    .finally(() => setRouterTimeout(32000))

  function fail() {
    t.ok(true, 'PageAction Promise did not execute because errors feature was disabled')
    t.end()
  }

  function setRouterTimeout(ms) {
    router.timeout = router.router.timeout = ms
  }
})
