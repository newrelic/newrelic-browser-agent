/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

// we use XHR for harvest calls only if browser support XHR
let cors = testDriver.Matcher.withFeature('cors')
let xhrWithAddEventListener = testDriver.Matcher.withFeature('xhrWithAddEventListener')
let supported = cors.and(xhrWithAddEventListener)

testDriver.test('timings are retried when collector returns 429', supported, function (t, browser, router) {
  let assetURL = router.assetURL('instrumented.html', {
    loader: 'spa',
    init: {
      page_view_timing: {
        enabled: true,
        initialHarvestSeconds: 2,
        harvestTimeSeconds: 2
      },
      harvest: {
        tooManyRequestsDelay: 5
      },
      spa: {
        enabled: false
      }
    }
  })

  router.scheduleResponse('timings', 429)

  let loadPromise = browser.safeGet(assetURL)
  let rumPromise = router.expectRum()
  let timingsPromise = router.expectTimings()

  let firstBody

  Promise.all([timingsPromise, loadPromise, rumPromise]).then(([timingsResult]) => {
    t.equal(timingsResult.res.statusCode, 429, 'server responded with 429')
    firstBody = timingsResult.body
    return router.expectTimings(undefined, 80000)
  }).then(result => {
    let secondBody = result.body

    t.equal(result.res.statusCode, 200, 'server responded with 200')
    t.equal(secondBody, firstBody, 'post body in retry harvest should be the same as in the first harvest')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

// NOTE: we do not test 408 response in a functional test because some browsers automatically retry
// 408 responses, which makes it difficult to distinguish browser retries from the agent retries
