/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

const BrowserMatcher = testDriver.Matcher
let stnSupported = testDriver.Matcher.withFeature('stn')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')

let reliableFinalHarvest = testDriver.Matcher.withFeature('reliableFinalHarvest')
  .and(notSafariWithSeleniumBug)

// final harvest for resources intermittently fails on additional browsers, probably due
// to the amount of data
// these excluded browsers fail to send final harvest for resources only
// used to create a composite matcher below
let excludeUnreliableResourcesHarvest = new BrowserMatcher()
  .exclude('ie')

let reliableResourcesHarvest = reliableFinalHarvest.and(excludeUnreliableResourcesHarvest)

testDriver.test('final harvest sends page action', reliableFinalHarvest, function (t, browser, router) {
  let url = router.assetURL('final-harvest.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  })

  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.seenRequests.ins, 0, 'no ins harvest yet')

      let insPromise = router.expectIns()

      let loadPromise = browser
        .safeEval('newrelic.addPageAction("hello", { a: 1 })')
        .get(router.assetURL('/'))

      return Promise.all([insPromise, loadPromise]).then(([ins, load]) => {
        return ins
      })
    })
    .then(() => {
      t.equal(router.seenRequests.ins, 1, 'received one ins harvest')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('final harvest sends js errors', reliableFinalHarvest, function (t, browser, router) {
  let url = router.assetURL('final-harvest.html')
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.seenRequests.errors, 0, 'no errors harvest yet')

      let errorsPromise = router.expectErrors()

      let domPromise = browser
        .elementById('errorBtn')
        .click()
        .get(router.assetURL('/'))

      return Promise.all([errorsPromise, domPromise]).then(([errors, clicked]) => {
        return errors
      })
    })
    .then(() => {
      t.equal(router.seenRequests.errors, 1, 'received one errors harvest')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('final harvest sends resources', reliableResourcesHarvest.and(stnSupported), function (t, browser, router) {
  let url = router.assetURL('final-harvest.html')
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.seenRequests.resources, 1, 'resources harvest is sent on startup')

      let resourcesPromise = router.expectResources()

      let domPromise = browser
        .setAsyncScriptTimeout(10000) // the default is too low for IE
        .elementById('resourcesBtn')
        .click()
        .waitForConditionInBrowser('window.timerLoopDone == true')
        .get(router.assetURL('/'))

      return Promise.all([resourcesPromise, domPromise]).then(([data, clicked]) => {
        return data
      })
    })
    .then(() => {
      t.equal(router.seenRequests.resources, 2, 'received second resources harvest')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('final harvest sends timings data', reliableFinalHarvest, function (t, browser, router) {
  let url = router.assetURL('final-harvest-timings.html', { loader: 'rum' })
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.seenRequests.events, 0, 'no events harvest yet')

      let timingsPromise = router.expectTimings()

      let domPromise = browser
        .setAsyncScriptTimeout(10000) // the default is too low for IE
        .elementById('standardBtn')
        .click()
        .get(router.assetURL('/'))

      return Promise.all([timingsPromise, domPromise]).then(([data, clicked]) => {
        return data
      })
    })
    .then(({body, query}) => {
      t.equal(router.seenRequests.events, 1, 'received first events harvest')
      const timings = querypack.decode(body && body.length ? body : query.e)
      t.ok(timings.length > 0, 'there should be at least one timing metric')
      t.equal(timings[0].type, 'timing', 'first node is a timing node')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

// This test checks that the agent sends multiple types of data types on unload
// It does not check all of them, just errors and resources.  This is sufficient for the
// test.  Sending more than that makes the test very fragile on some platforms.
testDriver.test('final harvest sends multiple', reliableResourcesHarvest.and(stnSupported), function (t, browser, router) {
  let url = router.assetURL('final-harvest-timings.html')
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.seenRequests.resources, 1, 'resources harvest is sent on startup')
      t.equal(router.seenRequests.errors, 0, 'no errors harvest yet')
      t.equal(router.seenRequests.events, 0, 'no events harvest yet')

      let resourcesPromise = router.expectResources()
      let errorsPromise = router.expectErrors()

      let domPromise = browser
        .setAsyncScriptTimeout(10000) // the default is too low for IE
        .elementById('errorBtn')
        .click()
        .elementById('resourcesBtn')
        .click()
        .waitForConditionInBrowser('window.timerLoopDone == true')
        .get(router.assetURL('/'))

      return Promise.all([resourcesPromise, errorsPromise, domPromise]).then(([data]) => {
        return data
      })
    })
    .then(() => {
      t.equal(router.seenRequests.resources, 2, 'received second resources harvest')
      t.equal(router.seenRequests.errors, 1, 'received one errors harvest')
      t.equal(router.seenRequests.events, 1, 'received one events/timing harvest')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
