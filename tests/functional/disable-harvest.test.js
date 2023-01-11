const testDriver = require('jil')

let supported = testDriver.Matcher.withFeature('notInternetExplorer')

var timedPromiseAll = (promises, ms = 5000) => Promise.race([
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject()
    }, ms)
  }),
  Promise.all(promises)
])

testDriver.test('METRICS -  Kills feature if 403', supported, function (t, browser, router) {
  const init = {
    metrics: { enabled: true, harvestTimeSeconds: 5 },
    jserrors: { enabled: false, harvestTimeSeconds: 5 }
  }
  router.scheduleResponse('jserrors', 403)

  const assetURL = router.assetURL('instrumented.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const errPromise = router.expectErrors()

  Promise.all([errPromise, rumPromise, loadPromise]).then(([errors]) => {
    t.equal(errors.res.statusCode, 403, 'server responded with 403')
    // wait 15 seconds to ensure time to retry (retry should not happen)
    timedPromiseAll([router.expectErrors()], 15000)
      .then(errors => {
        t.fail('should not have recieved more metrics')
      }).catch(() => {
        t.pass('did not recieve more metrics :)')
      }).finally(() => {
        t.end()
      })
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('SPA -  Kills feature if 403', supported, function (t, browser, router) {
  const init = {
    ajax: { enabled: false, harvestTimeSeconds: 5 },
    spa: {enabled: true, harvestTimeSeconds: 5},
    page_view_timing: {enabled: false, harvestTimeSeconds: 5}
  }
  router.scheduleResponse('events', 403)

  const assetURL = router.assetURL('instrumented.html', { loader: 'spa', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const spaPromise = router.expectEvents()

  Promise.all([spaPromise, rumPromise, loadPromise]).then(([errors]) => {
    t.equal(errors.res.statusCode, 403, 'server responded with 403')
    // wait 15 seconds to ensure time to retry (retry should not happen)
    timedPromiseAll([router.expectEvents()], 15000)
      .then(errors => {
        t.fail('should not have recieved more pvts')
      }).catch(() => {
        t.pass('did not recieve more pvts :)')
      }).finally(() => {
        t.end()
      })
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('ALL OTHER FEATURES - Kills feature if 403', supported, function (t, browser, router) {

  const init = {
    metrics: {enabled: false},
    jserrors: { harvestTimeSeconds: 5 },
    ajax: { harvestTimeSeconds: 5 },
    session_trace: {harvestTimeSeconds: 5},
    ins: {harvestTimeSeconds: 5},
    spa: {enabled: false},
    page_view_timing: {enabled: false}
  }
  router.scheduleResponse('jserrors', 403)
  router.scheduleResponse('events', 403)
  router.scheduleResponse('resources', 403)
  router.scheduleResponse('ins', 403)

  const assetURL = router.assetURL('instrumented.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const errPromise = router.expectErrors()
  const ajaxPromise = router.expectAjaxEvents()
  const stnPromise = router.expectResources()
  const pageActionPromise = router.expectIns()

  Promise.all([
    Promise.all([errPromise, rumPromise, loadPromise]).then(([errors]) => {
      t.equal(errors.res.statusCode, 403, 'errors - server responded with 403')
      // wait 15 seconds to ensure time to retry (retry should not happen)
      timedPromiseAll([router.expectErrors()], 15000)
        .then(errors => {
          t.fail('should not have recieved more errors')
        }).catch(() => {
          t.pass('did not recieve more errors :)')
        })
    }).catch(fail),

    Promise.all([ajaxPromise, rumPromise, loadPromise]).then(([data]) => {
      t.equal(data.res.statusCode, 403, 'ajax - server responded with 403')
      // wait 15 seconds to ensure time to retry (retry should not happen)
      timedPromiseAll([router.expectAjaxEvents()], 15000)
        .then(ajax => {
          t.fail('should not have recieved more ajax')
        }).catch(() => {
          t.pass('did not recieve more ajax :)')
        }).finally(() => {
          t.end()
        })
    }).catch(fail),

    Promise.all([stnPromise, rumPromise, loadPromise]).then(([data]) => {
      t.equal(data.res.statusCode, 403, 'session_trace - server responded with 403')
      // wait 15 seconds to ensure time to retry (retry should not happen)
      timedPromiseAll([router.expectResources()], 15000)
        .then(ajax => {
          t.fail('should not have recieved more stn')
        }).catch(() => {
          t.pass('did not recieve more stn :)')
        }).finally(() => {
          t.end()
        })
    }).catch(fail),

    Promise.all([pageActionPromise, rumPromise, loadPromise]).then(([data]) => {
      t.equal(data.res.statusCode, 403, 'page_action - server responded with 403')
      // wait 15 seconds to ensure time to retry (retry should not happen)
      timedPromiseAll([router.expectIns()], 15000)
        .then(ajax => {
          t.fail('should not have recieved more page_actions...')
        }).catch(() => {
          t.pass('did not recieve more page_actions :)')
        }).finally(() => {
          t.end()
        })
    }).catch(fail)
  ]).then(() => {
    t.end()
  }).catch(() => {
    t.end()
  })

  function fail(err) {
    t.error(err)
    t.end()
  }
})

// testDriver.test('SESSION_TRACE - Does not retry if 403', supported, function (t, browser, router) {
//   const init = {
//     session_trace: { enabled: true, harvestTimeSeconds: 5 }
//   }
//   router.scheduleResponse('resources', 403)

//   const assetURL = router.assetURL('instrumented.html', { loader: 'full', init })
//   const rumPromise = router.expectRum()
//   const loadPromise = browser.get(assetURL)
//   const ajaxPromise = router.expectAjaxEvents()

//   Promise.all([ajaxPromise, rumPromise, loadPromise]).then(([data]) => {
//     t.equal(data.res.statusCode, 403, 'server responded with 403')
//     // wait 15 seconds to ensure time to retry (retry should not happen)
//     timedPromiseAll([router.expectAjaxEvents()], 15000)
//       .then(errors => {
//         t.fail('should not have recieved more ajax')
//       }).catch(() => {
//         t.pass('did not recieve more ajax :)')
//       }).finally(() => {
//         t.end()
//       })
//   }).catch(fail)

//   function fail(err) {
//     t.error(err)
//     t.end()
//   }
// })