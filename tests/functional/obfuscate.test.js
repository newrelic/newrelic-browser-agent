/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')

const xhrBrowsers = testDriver.Matcher.withFeature('xhr')

testDriver.test('Obfuscate All Events', xhrBrowsers, function (t, browser, router) {
  // TODO: include router promises for all harvest types
   // TODO: load test HTML page that generates all event types
    //   nr-data.net/events/
    //    - browserinteraction harvest (includes SPA-associated ajax)
    //    - non-spa ajax events
    //    - pageviewtimings
    //   nr-data.net/err/
    //    - ajax metrics
    //    - js error events
    //   /
    //   /err/
  const ajaxPromise = router.expectAjaxEvents() // listening for /events (may specifically be listening for non-spa ajax events)
  const errorsPromise = router.expectErrors() // errors payload
  const insPromise = router.expectIns() // ins payload
  const resourcePromise = router.expectResources() // resource payload
  const interactionPromise = router.expectEvents() //
  const timingsPromise = router.expectTimings()
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('obfuscate.html', {
    loader: 'spa',
    init: {
      obfuscateUrls: [{
        regex: /bam-test/g,
        replacement: 'obfuscated'
      }, {
        regex: /fakeid/g
      } ],
      ajax: {
        harvestTimeSeconds: 2,
        enabled: true
      }}
  }))

  function checkPayload (payload, name) {
    t.ok(payload, 'Errors Payload exists')
    t.ok(!JSON.stringify(payload).includes('bam-test'), `bam-test was obfuscated in ${name}`)
    t.ok(!JSON.stringify(payload).includes('fakeid'), `fakeid was obfuscated in ${name}`)
  }

  Promise.all([ajaxPromise, errorsPromise, insPromise, resourcePromise, interactionPromise, timingsPromise, rumPromise, loadPromise])
    .then(([ajaxResponse, errorsResponse, insResponse, resourceResponse, interactionResponse, timingsResponse, rumResponse]) => {
      // TODO: check that all expected payloads came back
      checkPayload(rumResponse.query, 'Page View')
      checkPayload(ajaxResponse.body, 'AJAX')
      checkPayload(errorsResponse.body, 'Errors')
      checkPayload(insResponse.body, 'INS')
      checkPayload(resourceResponse.body, 'Resource')
      checkPayload(interactionResponse.body, 'Interactions')
      checkPayload(timingsResponse.body, 'Timings')
      t.end()
    }).catch(err => {
      t.error(err)
      t.end()
    })
})
