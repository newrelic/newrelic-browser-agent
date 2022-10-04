/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('session traces are retried when collector returns 429 during first harvest', supported, function (t, browser, router) {
  let assetURL = router.assetURL('instrumented.html', {
    loader: 'spa',
    init: {
      session_trace: {
        harvestTimeSeconds: 10
      },
      harvest: {
        tooManyRequestsDelay: 10
      }
    }
  })

  router.scheduleResponse('resources', 429)

  let loadPromise = browser.safeGet(assetURL)
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()

  let firstBody

  Promise.all([resourcePromise, loadPromise, rumPromise]).then(([result]) => {
    t.equal(result.res.statusCode, 429, 'server responded with 429')
    firstBody = result.body
    return router.expectResources()
  }).then(result => {
    let secondBody = result.body

    const firstParsed = JSON.parse(firstBody)
    const secondParsed = JSON.parse(secondBody)

    t.ok(secondParsed.res.length > firstParsed.res.length, 'second try has more nodes than first')
    t.ok(containsAll(secondParsed, firstParsed), 'all nodes have been resent')
    t.equal(result.res.statusCode, 200, 'server responded with 200')
    t.equal(router.seenRequests.resources, 2, 'got two harvest requests')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('retried first harvest captures ptid', supported, function (t, browser, router) {
  let assetURL = router.assetURL('lotsatimers.html', {
    loader: 'spa',
    init: {
      session_trace: {
        harvestTimeSeconds: 10
      },
      harvest: {
        tooManyRequestsDelay: 10
      }
    }
  })

  router.scheduleResponse('resources', 429)

  let loadPromise = browser.safeGet(assetURL)
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()

  Promise.all([resourcePromise, loadPromise, rumPromise]).then(([result]) => {
    t.equal(result.res.statusCode, 429, 'server responded with 429')
    return router.expectResources()
  }).then(result => {
    t.equal(result.res.statusCode, 200, 'server responded with 200')
    const domPromise = browser
      .elementByCssSelector('body')
      .click()
    return Promise.all([router.expectResources(), domPromise])
  }).then(([result]) => {
    t.equal(result.res.statusCode, 200, 'server responded with 200')
    t.ok(result.query.ptid, 'ptid was included')
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('session traces are retried when collector returns 429 during scheduled harvest', supported, function (t, browser, router) {
  let assetURL = router.assetURL('lotsatimers.html', {
    loader: 'spa',
    init: {
      session_trace: {
        harvestTimeSeconds: 10
      },
      harvest: {
        tooManyRequestsDelay: 10
      }
    }
  })

  let loadPromise = browser.safeGet(assetURL)
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()

  let firstBody, secondBody

  Promise.all([resourcePromise, loadPromise, rumPromise]).then(([result]) => {
    firstBody = result.body
    t.equal(result.res.statusCode, 200, 'server responded with 200')

    router.scheduleResponse('resources', 429)
    return router.expectResources()
  }).then(result => {
    t.equal(result.res.statusCode, 429, 'server responded with 429')
    secondBody = result.body
    return router.expectResources()
  }).then(result => {
    let thirdBody = result.body

    const firstParsed = JSON.parse(firstBody)
    const secondParsed = JSON.parse(secondBody)
    const thirdParsed = JSON.parse(thirdBody)

    t.ok(secondParsed.res.length > firstParsed.res.length, 'second try has more nodes than first')
    t.ok(containsAll(thirdParsed, secondParsed), 'all nodes have been resent')

    // this is really checking that no nodes have been resent
    var resentNodes = intersectPayloads(secondParsed, firstParsed)
    t.ok(resentNodes.length === 0, 'nodes from first successful harvest are not resent in second harvest')

    resentNodes = intersectPayloads(thirdParsed, firstParsed)
    t.ok(resentNodes.length === 0, 'nodes from first successful harvest are not resent in third harvest')

    t.equal(result.res.statusCode, 200, 'server responded with 200')
    t.equal(router.seenRequests.resources, 3, 'got three harvest requests')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

function containsAll(targetPayload, subsetPayload) {
  let allFound = true
  subsetPayload.res.forEach(node => {
    const found = targetPayload.res.find(getFindCallback(node))
    allFound = allFound && !!found
  })
  return allFound
}

function intersectPayloads(target, subset) {
  var nodes = []
  subset.res.forEach(node => {
    var found = target.res.find(getFindCallback(node))
    if (found) {
      nodes.push(found)
    }
  })
  return nodes
}

function getFindCallback(node) {
  return function(el) {
    return el.n === node.n &&
      el.s === node.s &&
      el.e === node.e &&
      el.o === node.o &&
      el.t === node.t
  }
}

// NOTE: we do not test 408 response in a functional test because some browsers automatically retry
// 408 responses, which makes it difficult to distinguish browser retries from the agent retries
