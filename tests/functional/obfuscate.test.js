/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')

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
  }))

  // accepts an object payload, fails test if stringified payload contains data that should be obfuscated
  function checkPayload(payload, name) {
    t.ok(payload, `${name} payload exists`)

    var strPayload = JSON.stringify(payload)
    var failed = strPayload.includes('bam-test') || strPayload.includes('fakeid') || strPayload.includes('pii')

    t.ok(!strPayload.includes('pii'), `${name} -- pii was obfuscated`)
    t.ok(!strPayload.includes('bam-test'), `${name} -- bam-test was obfuscated`)
    t.ok(!strPayload.includes('fakeid'), `${name} -- fakeid was obfuscated`)
  }

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
      ajaxResponse,
      errorsResponse,
      insResponse,
      resourceResponse,
      spaResponse,
      timingsResponse,
      rumResponse,
      loadPromise
    ]) => {
      checkPayload(ajaxResponse.body, 'AJAX')
      checkPayload(errorsResponse.body, 'Errors')
      checkPayload(insResponse.body, 'INS body')
      checkPayload(resourceResponse.body, 'Resource')
      checkPayload(spaResponse.body, 'SPA')
      checkPayload(timingsResponse.body, 'Timings')
      checkPayload(rumResponse.query, 'RUM') // see harvest.sendRum
      // See harvest.baseQueryString
      checkPayload(errorsResponse.query, 'Errors query')
      checkPayload(insResponse.query, 'INS query')
      checkPayload(resourceResponse.query, 'Resource query')
      checkPayload(spaResponse.query, 'SPA query')
      checkPayload(timingsResponse.query, 'Timings query')
      t.end()
    }).catch(err => {
      t.error(err)
      t.end()
    })
})
