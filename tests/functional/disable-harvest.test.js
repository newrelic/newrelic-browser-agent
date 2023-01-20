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

testDriver.test('METRICS - Kills feature if entitlements flag is 0', supported, function (t, browser, router) {
  const init = {
    metrics: { enabled: true, harvestTimeSeconds: 5 },
    jserrors: { enabled: false, harvestTimeSeconds: 5 },
  }

  router.scheduleReply('rum', {
    body: JSON.stringify({
      err: 0,
      ins: 1,
      spa: 1,
      stn: 1
    })
  })
  const assetURL = router.assetURL('obfuscate-pii.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const metricsPromise = router.expectMetrics(7000)

  Promise.all([rumPromise, loadPromise]).then(() => {
    timedPromiseAll([metricsPromise], 10000).then(metrics => {
      t.fail('should not have received metrics')
    }).catch(() => {
      t.pass('did not receive metrics :)')
    }).finally(() => {
      t.end()
    })
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})


testDriver.test('ERRORS - Kills feature if entitlements flag is 0', supported, function (t, browser, router) {
  const init = {
    metrics: { enabled: false, harvestTimeSeconds: 5 },
    jserrors: { enabled: true, harvestTimeSeconds: 5 },
  }

  router.scheduleReply('rum', {
    body: JSON.stringify({
      err: 0,
      ins: 1,
      spa: 1,
      stn: 1
    })
  })
  const assetURL = router.assetURL('obfuscate-pii.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const errPromise = router.expectErrors(7000)

  Promise.all([rumPromise, loadPromise]).then(() => {
    timedPromiseAll([errPromise], 10000).then(errs => {
      t.fail('should not have received errors')
    }).catch(() => {
      t.pass('did not receive errors :)')
    }).finally(() => {
      t.end()
    })
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('SPA - Kills feature if entitlements flag is 0', supported, function (t, browser, router) {
  const init = {
    ajax: { enabled: false, harvestTimeSeconds: 5 },
    spa: {enabled: true, harvestTimeSeconds: 5},
    page_view_timing: {enabled: false, harvestTimeSeconds: 5}
  }

  router.scheduleReply('rum', {
    body: JSON.stringify({
      err: 1,
      ins: 1,
      spa: 0,
      stn: 1
    })
  })
  const assetURL = router.assetURL('obfuscate-pii.html', { loader: 'spa', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const spaPromise = router.expectEvents(7000)

  Promise.all([rumPromise, loadPromise]).then(() => {
    timedPromiseAll([spaPromise], 10000).then(() => {
      t.fail('should not have recieved spa data')
    }).catch(() => {
      t.pass('did not recieve spa data :)')
    }).finally(() => {
      t.end()
    })
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})


testDriver.test('PAGE ACTIONS - Kills feature if entitlements flag is 0', supported, function (t, browser, router) {
  const init = {
    ins: {enabled: true, harvestTimeSeconds: 5}
  }

  router.scheduleReply('rum', {
    body: JSON.stringify({
      err: 1,
      ins: 0,
      spa: 1,
      stn: 1
    })
  })
  const assetURL = router.assetURL('obfuscate-pii.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const insPromise = router.expectIns(7000)

  Promise.all([rumPromise, loadPromise]).then(() => {
    timedPromiseAll([insPromise], 10000).then(() => {
      t.fail('should not have recieved page action')
    }).catch(() => {
      t.pass('did not recieve page action data :)')
    }).finally(() => {
      t.end()
    })
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})
