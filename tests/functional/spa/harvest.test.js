/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')
const { testEventsRequest } = require('../../../tools/testing-server/utils/expect-tests')

let corsSupported = testDriver.Matcher.withFeature('cors')

testDriver.test('events are retried when collector returns 429', corsSupported, function (t, browser, router) {
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

  let loadPromise = browser.safeGet(assetURL)
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()

  let firstBody

  Promise.all([eventsPromise, loadPromise, rumPromise]).then(([eventsResult]) => {
    t.equal(eventsResult.reply.statusCode, 429, 'server responded with 429')
    firstBody = eventsResult.request.body
    return router.expectEvents()
  }).then(result => {
    t.equal(router.requestCounts.bamServer.events, 2, 'got two events harvest requests')

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

testDriver.test('multiple custom interactions have correct customEnd value', corsSupported, function (t, browser, router) {
  let assetURL = router.assetURL('spa/multiple-custom-interactions.html', {
    loader: 'spa',
    init: {
      spa: {
        harvestTimeSeconds: 2
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

  let loadPromise = browser.safeGet(assetURL)
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()

  Promise.all([eventsPromise, loadPromise, rumPromise]).then(([eventsResult]) => {
    const qpData = querypack.decode(eventsResult.request.body)

    t.ok(qpData.length === 3, 'three interactions should have been captured')
    qpData.forEach(interaction => {
      t.ok(['interaction1', 'interaction2', 'interaction4'].indexOf(interaction.customName) > -1, 'interaction has expected custom name')
      const customEndTime = interaction.children.find(child => child.type === 'customEnd')
      t.ok(customEndTime.time >= interaction.end, 'interaction custom end time is equal to or greater than interaction end time')
    })

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
