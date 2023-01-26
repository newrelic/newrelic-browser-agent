/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const {testEventsRequest} = require("../../../tools/testing-server/utils/expect-tests");

// we use XHR for harvest calls only if browser support XHR
let cors = testDriver.Matcher.withFeature('cors')
let xhrWithAddEventListener = testDriver.Matcher.withFeature('xhrWithAddEventListener')
let supported = cors.and(xhrWithAddEventListener)

testDriver.test('events are retried when collector returns 429', supported, function (t, browser, router) {
  let assetURL = router.assetURL('instrumented.html', {
    loader: 'spa',
    init: {
      spa: {
        harvestTimeSeconds: 10
      },
      harvest: {
        tooManyRequestsDelay: 10
      },
      page_view_timing: {
        enabled: false
      },
      ajax: {
        deny_list: ['bam-test-1.nr-local.net']
      }
    }
  })

  router.scheduleReply('bamServer', {
    test: testEventsRequest,
    statusCode: 429
  })

  let loadPromise = browser.safeGet(assetURL).waitForFeature('loaded')
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()

  let firstBody

  Promise.all([eventsPromise, loadPromise, rumPromise]).then(([eventsResult]) => {
    t.equal(eventsResult.reply.statusCode, 429, 'server responded with 429')
    firstBody = eventsResult.request.body
    return router.expectEvents()
  }).then((result) => {
    let secondBody = result.request.body

    t.equal(result.reply.statusCode, 200, 'server responded with 200')
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
