/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let corsSupported = testDriver.Matcher.withFeature('cors');

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
  router.scheduleResponse('jserrors', 429)

  let loadPromise = browser.get(assetURL)
  let rumPromise = router.expectRum()
  let errPromise = router.expectErrors()

  let firstBody

  Promise.all([errPromise, loadPromise, rumPromise]).then(([errResult]) => {
    t.equal(errResult.res.statusCode, 429, 'server responded with 429')
    firstBody = JSON.parse(errResult.body).err
    return router.expectErrors()
  }).then(result => {
    let secondBody = JSON.parse(result.body).err

    t.equal(result.res.statusCode, 200, 'server responded with 200')
    t.deepEqual(secondBody, firstBody, 'post body in retry harvest should be the same as in the first harvest')
    t.equal(router.seenRequests.errors_post, 2, 'got two jserrors harvest requests')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

// NOTE: we do not test 408 response in a functional test because some browsers automatically retry
// 408 responses, which makes it difficult to distinguish browser retries from the agent retries
