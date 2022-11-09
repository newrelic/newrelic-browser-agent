/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const {fail} = require('../uncat-internal-help.cjs')

const init = {
  spa: {
    harvestTimeSeconds: 5
  },
  // harvest: {
  //   tooManyRequestsDelay: 10
  // },
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  },
  page_view_timing: {
    enabled: false
  },
  ajax: {
    enabled: false
  }
}

var timedPromiseAll = (promises, ms) => Promise.race([
  new Promise((resolve) => {
    setTimeout(() => resolve(), ms)
  }),
  Promise.any(promises)
])

testDriver.test('jspdf generation should not cause error', function (t, browser, router) {
  // t.plan(1)

  // This only works with the full loader. With the SPA loader, an internal error is still generated but the PDF is now generating.
  let loadPromise = browser.get(router.assetURL('third-party-compatibility/jspdf.html', { loader: 'full', init }))
  let rumPromise = router.expectRum()
  let errPromise = router.expectErrors()

  Promise.all([loadPromise, rumPromise])
    .then(() => {
      return browser.elementByCssSelector('#createPdf').click()
    })
    .then(() => {
      return timedPromiseAll([errPromise], 6000)
    })
    .then((response) => {
      if (response) { 
        // will be null if timed out, so a payload here means it sent and error
        t.fail(`Should not have generated "error" payload`)
      } else {
        // errors harvest every 5 seconds, if 6 seconds pass and Promise is not resolved, that means it was never generated
        t.pass(`Did not generate "error" payload`)
      }
      t.end()
    }).catch(fail)
})
