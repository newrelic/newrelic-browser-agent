/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../../tools/jil/index')
const { getErrorsFromResponse, getAppIdFromResponse } = require('../../err/assertion-helpers')

const es6 = testDriver.Matcher.withFeature('es6')

const opts = {
  init: {
    jserrors: {
      harvestTimeSeconds: 2
    }
  }
}

testDriver.test('Error objects are sent to separate apps via noticeError from npm bundles and from top-level script', es6, function (t, browser, router) {
  t.plan(10)

  let loadPromise = browser.safeGet(router.assetURL('test-builds/build-time-mfe/index.html', opts))
  let initPromise = router.expectCustomGet('/1/{key}', (req, res) => { res.end('NREUM.setToken({stn: 1, err: 1, ins: 1, cap: 1, spa: 1, loaded: 1})') })

  const appsOnPage = [
    {
      appID: 1,
      message: 'puppy',
      seen: false
    },
    {
      appID: 2,
      message: 'kitten',
      seen: false
    },
    {
      appID: 3,
      message: 'full',
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

  Promise.all([loadPromise, initPromise, ...errorPromises])
    .then(([loadResult, initResult, ...errors]) => {
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
