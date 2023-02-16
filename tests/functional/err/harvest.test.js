/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { testErrorsRequest } = require('../../../tools/testing-server/utils/expect-tests')

let corsSupported = testDriver.Matcher.withFeature('cors')

testDriver.test('jserrors are retried when collector returns 429', corsSupported, function (t, browser, router) {
  let assetURL = router.assetURL('external-uncaught-error.html', {
    init: {
      jserrors: {
        harvestTimeSeconds: 5
      },
      harvest: {
        tooManyRequestsDelay: 10
      },
      metrics: {
        enabled: false
      }
    }
  })

  // simulate 429 response for the first jserrors request
  router.scheduleReply('bamServer', {
    test: testErrorsRequest,
    statusCode: 429
  })

  let loadPromise = browser.get(assetURL)
  let rumPromise = router.expectRum()
  let errPromise = router.expectErrors()

  let firstBody

  Promise.all([errPromise, loadPromise, rumPromise]).then(([errResult]) => {
    t.equal(errResult.reply.statusCode, 429, 'server responded with 429')
    firstBody = JSON.parse(errResult.request.body).err
    return router.expectErrors()
  }).then(result => {
    let secondBody = JSON.parse(result.request.body).err

    t.equal(result.reply.statusCode, 200, 'server responded with 200')
    t.deepEqual(secondBody, firstBody, 'post body in retry harvest should be the same as in the first harvest')
    t.equal(router.requestCounts.bamServer.jserrors, 2, 'got two jserrors harvest requests')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

// NOTE: we do not test 408 response in a functional test because some browsers automatically retry
// 408 responses, which makes it difficult to distinguish browser retries from the agent retries
