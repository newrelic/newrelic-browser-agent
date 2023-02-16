/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const { fail, checkPayload } = require('./uncat-internal-help.cjs')

const browsers = testDriver.Matcher.withFeature('fetchExt')

testDriver.test('Obfuscate All Events', browsers, function (t, browser, router) {
  const spaPromise = router.expectEvents()
  const ajaxPromise = router.expectAjaxEvents()
  const timingsPromise = router.expectTimings()
  const errorsPromise = router.expectErrors()
  const insPromise = router.expectIns()
  const resourcePromise = router.expectResources()
  const rumPromise = router.expectRum()

  const loadPromise = browser.safeGet(router.assetURL('obfuscate-pii.html', {
    loader: 'spa',
    init: {
      obfuscate: [{
        regex: /bam-test/g,
        replacement: 'OBFUSCATED'
      }, {
        regex: /fakeid/g
      }, {
        regex: /pii/g,
        replacement: 'OBFUSCATED'
      }, {
        regex: /comma/g,
        replacement: 'invalid,string'
      }, {
        regex: /semicolon/g,
        replacement: 'invalid;string'
      }, {
        regex: /backslash/g,
        replacement: 'invalid\\string'
      }],
      ajax: {
        harvestTimeSeconds: 2,
        enabled: true
      },
      jserrors: {
        harvestTimeSeconds: 2
      },
      ins: {
        harvestTimeSeconds: 2
      }
    }
  })).waitForFeature('loaded')

  Promise.all([
    ajaxPromise,
    errorsPromise,
    insPromise,
    resourcePromise,
    spaPromise,
    timingsPromise,
    rumPromise,
    loadPromise
  ])
    .then(([
      { request: ajaxResponse },
      { request: errorsResponse },
      { request: insResponse },
      { request: resourceResponse },
      { request: spaResponse },
      { request: timingsResponse },
      { request: rumResponse }
    ]) => {
      checkPayload(t, ajaxResponse.body, 'AJAX')
      checkPayload(t, errorsResponse.body, 'Errors')
      checkPayload(t, insResponse.body, 'INS body')
      checkPayload(t, resourceResponse.body, 'Resource')
      checkPayload(t, spaResponse.body, 'SPA')
      checkPayload(t, timingsResponse.body, 'Timings')
      checkPayload(t, rumResponse.query, 'RUM') // see harvest.sendRum
      // See harvest.baseQueryString
      checkPayload(t, errorsResponse.query, 'Errors query')
      checkPayload(t, insResponse.query, 'INS query')
      checkPayload(t, resourceResponse.query, 'Resource query')
      checkPayload(t, spaResponse.query, 'SPA query')
      checkPayload(t, timingsResponse.query, 'Timings query')
      t.end()
    }).catch(fail(t))
})
