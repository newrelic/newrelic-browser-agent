/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

let supported = testDriver.Matcher.withFeature('stn')

testDriver.test('session trace resources', supported, function (t, browser, router) {
  let assetURL = router.assetURL('stn/instrumented.html', {
    loader: 'full',
    init: {
      stn: {
        harvestTimeSeconds: 5
      },
      ajax: {
        enabled: false
      },
      page_view_timing: {
        enabled: false
      }
    }
  })

  let loadPromise = browser.safeGet(assetURL)
  let rumPromise = router.expectRum()
  let resourcePromise = router.expectResources()
  let firstBody

  Promise.all([resourcePromise, loadPromise, rumPromise]).then(([result]) => {
    t.equal(result.res.statusCode, 200, 'server responded with 200')

    // first harvest is complete and should be a resource entry in second harvest
    firstBody = result.body

    // trigger an XHR call after
    let domPromise = browser
      .elementById('trigger')
      .click()

    return domPromise
  }).then(result => {
    // capture resourceBuffer after /json call and before second harvest request is made
    return browser.eval("window.performance.getEntriesByType('resource')")
  }).then(evalResult => {
    resourcePromise = router.expectResources()
    return Promise.all([evalResult, resourcePromise])
  }).then(result => {
    const resourceBuffer = result[0]
    const secondBody = result[1].body

    t.equal(router.seenRequests.resources, 2, 'got two harvest requests')
    t.equal(result[1].res.statusCode, 200, 'server responded with 200')

    const firstParsed = JSON.parse(firstBody).res
    const secondParsed = JSON.parse(secondBody).res
    const harvestBody = firstParsed.concat(secondParsed)
    const resources = harvestBody.filter(function (node) { return node.t === 'resource' })

    t.ok(resources.length >= 1, 'there is at least one resource node')
    t.equal(resources.length, resourceBuffer.length, 'STN captured same number of resources as ResourceTiming API')

    const identical = resources.every(resource => {
      const match = resourceBuffer.find(bufResource => {
        const startTime = bufResource.fetchStart | 0
        const endTime = bufResource.responseEnd | 0
        return startTime === resource.s && endTime === resource.e
      })

      t.ok(match, 'found a match for ' + resource.n + ' resource with source ' + resource.o)

      return match
    })

    t.ok(identical, 'STN resource nodes match the ResourceTiming API buffer')

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
