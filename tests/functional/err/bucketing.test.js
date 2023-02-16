/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('jil')
const { assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse } = require('./assertion-helpers')
const { testErrorsRequest } = require('../../../tools/testing-server/utils/expect-tests')

let supported = testDriver.Matcher.withFeature('notInternetExplorer')
const init = {
  page_view_timing: {
    enabled: false
  },
  metrics: {
    enabled: false
  },
  jserrors: {
    enabled: true,
    harvestTimeSeconds: 5
  }
}

testDriver.test('NR-40043: Multiple errors with noticeError and unique messages should not bucket', supported, function (t, browser, router) {
  const assetURL = router.assetURL('js-errors-noticeerror-bucketing.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const errPromise = router.expectErrors()

  Promise.all([errPromise, rumPromise, loadPromise]).then(([{ request: errors }]) => {
    assertErrorAttributes(t, errors.query, 'has errors')

    const actualErrors = getErrorsFromResponse(errors, browser)

    let expectedErrors = [...Array(8)].map((_, i) => ({
      name: 'Error',
      message: `Error message ${i + 1}`,
      stack: [{
        u: '<inline>',
        l: 36
      }, {
        u: '<inline>',
        l: 35
      }]
    }))

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('NR-40043: Multiple errors with noticeError and unique messages should not bucket when retrying due to 429', supported, function (t, browser, router) {
  router.scheduleReply('bamServer', {
    test: testErrorsRequest,
    statusCode: 429
  })

  const assetURL = router.assetURL('js-errors-noticeerror-bucketing.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const errPromise = router.expectErrors()
  let firstBody

  Promise.all([errPromise, rumPromise, loadPromise]).then(([errors]) => {
    t.equal(errors.reply.statusCode, 429, 'server responded with 429')
    firstBody = JSON.parse(errors.request.body).err
    return router.expectErrors()
  }).then(errors => {
    let secondBody = JSON.parse(errors.request.body).err

    t.equal(errors.reply.statusCode, 200, 'server responded with 200')
    t.deepEqual(secondBody, firstBody, 'post body in retry harvest should be the same as in the first harvest')
    t.equal(router.requestCounts.bamServer.jserrors, 2, 'got two jserrors harvest requests')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('NEWRELIC-3788: Multiple identical errors from the same line but different columns should not be bucketed', supported, function (t, browser, router) {
  const assetURL = router.assetURL('js-error-column-bucketing.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const errPromise = router.expectErrors()

  Promise.all([errPromise, rumPromise, loadPromise]).then(([{ request: errors }]) => {
    assertErrorAttributes(t, errors.query, 'has errors')

    const actualErrors = getErrorsFromResponse(errors, browser)
    t.ok(actualErrors.length === 2, 'two errors reported')
    t.ok(typeof actualErrors[0].params.stack_trace === 'string', 'first error has stack trace')
    t.ok(typeof actualErrors[1].params.stack_trace === 'string', 'second error has stack trace')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('NEWRELIC-3788: Multiple identical errors from the same line but different columns should not be bucketed when retrying due to 429', supported, function (t, browser, router) {
  router.scheduleReply('bamServer', {
    test: testErrorsRequest,
    statusCode: 429
  })

  const assetURL = router.assetURL('js-error-column-bucketing.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const errPromise = router.expectErrors()
  let firstBody

  Promise.all([errPromise, rumPromise, loadPromise]).then(([errors]) => {
    t.equal(errors.reply.statusCode, 429, 'server responded with 429')
    firstBody = JSON.parse(errors.request.body).err
    return router.expectErrors()
  }).then(errors => {
    let secondBody = JSON.parse(errors.request.body).err

    t.equal(errors.reply.statusCode, 200, 'server responded with 200')
    t.deepEqual(secondBody, firstBody, 'post body in retry harvest should be the same as in the first harvest')
    t.equal(router.requestCounts.bamServer.jserrors, 2, 'got two jserrors harvest requests')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
