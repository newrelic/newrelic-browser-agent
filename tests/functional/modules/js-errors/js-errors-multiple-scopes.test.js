/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../../tools/jil/index')
const { getErrorsFromResponse, getAppIdFromResponse } = require('../../err/assertion-helpers')

const supported = testDriver.Matcher.withFeature('customElements')

const opts = {
  init: {
    jserrors: {
      harvestTimeSeconds: 2
    }
  }
}

testDriver.test('Error objects are sent to separate apps via noticeError from npm bundles and from top-level script', supported, function (t, browser, router) {
  t.plan(10)

  let loadPromise = browser.safeGet(router.assetURL('test-builds/build-time-mfe/index.html', opts))

  const appsOnPage = [
    // component-1 - @newrelic/browser-agent
    {
      appID: 1,
      message: 'puppy',
      seen: false
    },
    // component-2 - @newrelic/browser-agent
    {
      appID: 2,
      message: 'kitten',
      seen: false
    },
    // container - @newrelic/browser-agent -- should detect global errors
    // component - 1 throws a global error, container should catch that.
    {
      appID: 3,
      message: 'component-1 threw global error',
      seen: false
    }
  ]

  const errorPromises = appsOnPage.map(app => router.expectErrors(app.appID))

  function testError(appID, exceptionClass, message) {
    const app = appsOnPage.find(x => Number(x.appID) === Number(appID))
    if (app) app.seen = true
    t.ok(!!app, 'App ID is expected -- ' + app.appID)
    t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string. -- ' + app.appID)
    t.ok(message.toLowerCase().includes(app.message), 'Params contain the right error message. -- ' + app.appID)
  }

  Promise.all([loadPromise, ...errorPromises])
    .then(([loadResult, ...errors]) => {
      errors.forEach(result => {
        var errorData = getErrorsFromResponse(result)
        var appID = getAppIdFromResponse(result)
        var params = errorData[0] && errorData[0]['params']

        if (params) {
          var exceptionClass = params.exceptionClass
          var message = params.message
          testError(appID, exceptionClass, message)
        } else {
          fail('No error data was received.')
        }
      })
      t.ok(appsOnPage.every(app => app.seen), 'Saw all erroring app IDs')
      t.end()
    })
    .catch(fail)

  function fail(e) {
    t.error(e)
    t.end()
  }
})
