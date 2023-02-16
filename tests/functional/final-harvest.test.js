/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

const BrowserMatcher = testDriver.Matcher
let stnSupported = testDriver.Matcher.withFeature('stn')

let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')
let workingSendBeacon = testDriver.Matcher.withFeature('workingSendBeacon')
  .and(notSafariWithSeleniumBug)

// final harvest for resources intermittently fails on additional browsers, probably due
// to the amount of data
// these excluded browsers fail to send final harvest for resources only
// used to create a composite matcher below
let excludeUnreliableResourcesHarvest = new BrowserMatcher()
  .exclude('ie')

let doNotSupportWaitForConditionInBrowser = new BrowserMatcher()
  .exclude('safari', '<=10.0')
let reliableResourcesHarvest = workingSendBeacon.and(excludeUnreliableResourcesHarvest)
let reliablePageUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')

/** iOS is still shaky while on 'pagehide' callback. "reliablePageUnload" may be needed if it fails this test file too often.
 *  In the future, removing 'pagehide' listener and relying on visibilitychange alone may yield higher success.
 */
testDriver.test('final harvest happens on page unload -- new unload BFC work', function (t, browser, router) {
  let url = router.assetURL('final-harvest.html', {
    init: {
      allow_bfcache: true,
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  })

  let loadPromise = browser.safeGet(url).catch(fail(t))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.requestCounts.bamServer.ins, undefined, 'no ins harvest yet')
      t.equal(router.requestCounts.bamServer.jserrors, undefined, 'no err harvest yet')

      let insPromise = router.expectIns()
      let errPromise = router.expectErrors()
      let loadPromise2 = browser
        .safeEval('newrelic.addPageAction("hello", { a: 1 })')
        .safeEval('newrelic.noticeError("test")')
        .get(router.assetURL('/')) // test that navigation away aka redirect triggers final harvest

      return Promise.all([insPromise, errPromise, loadPromise2]).then((respArr) => {
        return respArr
      })
    })
    .then((results) => {
      t.equal(router.requestCounts.bamServer.ins, 1, 'received one ins harvest')
      t.equal(router.requestCounts.bamServer.jserrors, 1, 'received one err harvest')

      if (results[0].request.body) {
        t.ok(JSON.parse(results[0].request.body).ins, 'received ins harvest')
      } else {
        t.ok(JSON.parse(results[0].request.query.ins), 'received ins harvest')
      }
      if (results[0].request.body) {
        t.ok(JSON.parse(results[1].request.body).err, 'received err harvest')
      } else {
        t.ok(JSON.parse(results[1].request.query.err), 'received err harvest')
      }
      t.end()
    })
    .catch(fail(t))
})
/** iOS or mobile doesn't like the way the (wd) new tab is driven, so this test almost always timeout for iOS.
 *  WD's .newWindow causes later tests to fail. JWP mapping is complicated to figure out how to solve this. Can reassess this test with webdriveio later. */
/*testDriver.test('final harvest happens on doc hide -- new unload BFC work', reliablePageUnload, function (t, browser, router) {
  let url = router.assetURL('final-harvest.html', {
    init: {
      allow_bfcache: true,
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  })

  let loadPromise = browser.safeGet(url).catch(fail(t))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.seenRequests.ins, 0, 'no ins harvest yet')
      t.equal(router.seenRequests.errors, 0, 'no err harvest yet')

      let insPromise = router.expectIns()
      let errPromise = router.expectErrors()
      let loadPromise2 = browser
        .safeEval('newrelic.addPageAction("hello", { a: 1 })')
        .safeEval('newrelic.noticeError("test")')
        .newWindow(router.assetURL('/'), 'newTab'); // test that opening new tab aka page becoming hidden triggers final harvest too

      return Promise.all([insPromise, errPromise, loadPromise2]).then((respArr) => {
        return respArr
      })
    })
    .then(() => {
      t.equal(router.seenRequests.ins, 1, 'received one ins harvest')
      t.equal(router.seenRequests.errors, 1, 'received one err harvest')
      t.end();
    })
    .catch(fail(t))
})*/

function fail (t, err) {
  return (err) => {
    t.error(err)
    t.end()
  }
}

testDriver.test('final harvest sends page action', workingSendBeacon, function (t, browser, router) {
  let url = router.assetURL('final-harvest.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  })

  let loadPromise = browser.safeGet(url).catch(fail(t))
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.requestCounts.bamServer.ins, undefined, 'no ins harvest yet')

      let insPromise = router.expectIns()

      let loadPromise = browser
        .safeEval('newrelic.addPageAction("hello", { a: 1 })')
        .get(router.assetURL('/'))

      return Promise.all([insPromise, loadPromise])
    }).then((results) => {
      t.equal(router.requestCounts.bamServer.ins, 1, 'received one ins harvest')

      t.ok(results[0].request.body, 'received ins harvest')
      t.end()
    })
    .catch(fail(t))
})

testDriver.test('final harvest sends pageHide if not already recorded', workingSendBeacon, function (t, browser, router) {
  let url = router.assetURL('final-harvest-timings.html', { loader: 'rum' })
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()
  const start = Date.now()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.requestCounts.bamServer.events, undefined, 'no events harvest yet')

      let timingsPromise = router.expectTimings()

      let domPromise = browser
        .setAsyncScriptTimeout(10000) // the default is too low for IE
        .elementById('standardBtn')
        .click()
        .get(router.assetURL('/'))

      return Promise.all([timingsPromise, domPromise]).then(([data]) => {
        return data
      })
    })
    .then(({ request: { body, query } }) => {
      t.equal(router.requestCounts.bamServer.events, 1, 'received one events harvest')

      const timings = querypack.decode(body && body.length ? body : query.e)
      const pageHide = timings.find(x => x.type === 'timing' && x.name === 'pageHide')
      const duration = Date.now() - start
      t.ok(timings.length > 0, 'there should be at least one timing metric')
      t.ok(!!pageHide, 'Final harvest should have a pageHide timing')
      t.ok(pageHide.value > 0, 'pageHide should have a value')
      t.ok(pageHide.value <= duration, 'pageHide value should be valid')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('final harvest doesnt append pageHide if already previously recorded', workingSendBeacon, function (t, browser, router) {
  let url = router.assetURL('pagehide.html', { loader: 'rum' })
  let loadPromise = browser.safeGet(url).catch(fail)
  let start = Date.now()

  Promise.all([loadPromise, router.expectRum()])
    .then(() => {
      const clickPromise = browser
        .elementById('btn1').click()
        .get(router.assetURL('/'))
      const timingsPromise = router.expectTimings()
      return Promise.all([timingsPromise, clickPromise])
    })
    .then(([{ request: { body, query } }]) => {
      const timings = querypack.decode(body && body.length ? body : query.e)
      let duration = Date.now() - start
      t.ok(timings.length > 0, 'there should be at least one timing metric')
      const pageHide = timings.filter(t => t.name === 'pageHide')
      t.ok(timings && pageHide.length === 1, 'there should be ONLY ONE pageHide timing')
      t.ok(pageHide[0].value > 0, 'value should be a positive number')
      t.ok(pageHide[0].value <= duration, 'value should not be larger than time since start of the test')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('final harvest sends js errors', workingSendBeacon, function (t, browser, router) {
  let url = router.assetURL('final-harvest.html', { init: { metrics: { enabled: false } } })
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.requestCounts.bamServer.jserrors, undefined, 'no errors harvest yet')

      let errorsPromise = router.expectErrors()

      let domPromise = browser
        .elementById('errorBtn')
        .click()
        .get(router.assetURL('/'))

      return Promise.all([errorsPromise, domPromise])
    })
    .then((results) => {
      t.equal(router.requestCounts.bamServer.jserrors, 1, 'received one errors harvest')
      t.ok(results[0].request.body, 'received err harvest')
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
      t.equal(router.requestCounts.bamServer.resources, 1, 'resources harvest is sent on startup')

      let resourcesPromise = router.expectResources()

      let domPromise = browser
        .setAsyncScriptTimeout(10000) // the default is too low for IE
        .elementById('resourcesBtn')
        .click()
        .waitForConditionInBrowser('window.timerLoopDone == true')
        .get(router.assetURL('/'))

      return Promise.all([resourcesPromise, domPromise])
    })
    .then((results) => {
      t.equal(router.requestCounts.bamServer.resources, 2, 'received second resources harvest')
      t.ok(results[0].request.body, 'received res harvest')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('final harvest sends timings data', workingSendBeacon, function (t, browser, router) {
  let url = router.assetURL('final-harvest-timings.html', { loader: 'rum' })
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.requestCounts.bamServer.events, undefined, 'no events harvest yet')

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
    .then(({ request: { body, query } }) => {
      t.equal(router.requestCounts.bamServer.events, 1, 'received first events harvest')

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

// // This test checks that the agent sends multiple types of data types on unload
// // It does not check all of them, just errors and resources.  This is sufficient for the
// // test.  Sending more than that makes the test very fragile on some platforms.
testDriver.test('final harvest sends multiple', reliableResourcesHarvest.and(stnSupported), function (t, browser, router) {
  let url = router.assetURL('final-harvest-timings.html', { init: { metrics: { enabled: false } } })
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.requestCounts.bamServer.resources, 1, 'resources harvest is sent on startup')
      t.equal(router.requestCounts.bamServer.jserrors, undefined, 'no errors harvest yet')

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

      return Promise.all([resourcesPromise, errorsPromise, domPromise])
    })
    .then((results) => {
      t.equal(router.requestCounts.bamServer.resources, 2, 'received second resources harvest')
      t.equal(router.requestCounts.bamServer.jserrors, 1, 'received one errors harvest')

      t.ok(results[0].request.body, 'received res harvest')
      t.ok(results[1].request.body, 'received err harvest')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('final harvest sends ajax events', workingSendBeacon.and(doNotSupportWaitForConditionInBrowser), function (t, browser, router) {
  let url = router.assetURL('final-harvest-ajax.html', { loader: 'spa', init: { ajax: { enabled: true } } })
  let loadPromise = browser.safeGet(url).catch(fail)
  let rumPromise = router.expectRum()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      let eventsPromise = router.expectAjaxEvents()

      let domPromise = browser
        .setAsyncScriptTimeout(10000) // the default is too low for IE
        .elementById('btnGenerate')
        .click()
        .waitForConditionInBrowser('window.ajaxCallsDone == true')
        .get(router.assetURL('/'))

      return Promise.all([eventsPromise, domPromise]).then(([data, clicked]) => {
        return data
      })
    })
    .then(({ request: { body, query } }) => {
      const events = querypack.decode(body && body.length ? body : query.e)
      t.ok(events.length > 0, 'there should be at least one ajax call')
      t.equal(events[0].type, 'ajax', 'first node is a ajax node')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
