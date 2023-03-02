const testDriver = require('jil')
const { testRumRequest } = require('../../tools/testing-server/utils/expect-tests')

let supported = testDriver.Matcher.withFeature('notInternetExplorer')

testDriver.test('METRICS, ERRORS - Kills feature if entitlements flag is 0', supported, function (t, browser, router) {
  const init = {
    metrics: { enabled: true },
    jserrors: { enabled: true }
  }

  router.scheduleReply('bamServer', {
    test: testRumRequest,
    body: `NREUM.setToken(${JSON.stringify({
      stn: 1,
      err: 0,
      ins: 1,
      cap: 1,
      spa: 1,
      loaded: 1
    })
    })`
  })

  const assetURL = router.assetURL('obfuscate-pii.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const metricsPromise = router.expectMetrics(5000)
  const errorsPromise = router.expectErrors(5000)

  Promise.all([rumPromise, loadPromise])
    .then(() => browser.get(router.assetURL('/'))) // metrics only harvest on EoL
    .then(() => Promise.any([metricsPromise, errorsPromise])) // if EITHER of these resolve, then that's BAD
    .then(() => {
      t.fail('should not have received metrics or errors')
    })
    .catch(() => {
      t.pass('did not receive metrics or errors :)')
    })
    .finally(() => t.end())
})

testDriver.test('SPA - Kills feature if entitlements flag is 0', supported, function (t, browser, router) {
  const init = {
    ajax: { enabled: false },
    spa: { enabled: true, harvestTimeSeconds: 5 },
    page_view_timing: { enabled: false }
  }

  router.scheduleReply('bamServer', {
    test: testRumRequest,
    body: `NREUM.setToken(${JSON.stringify({
      stn: 1,
      err: 1,
      ins: 1,
      cap: 1,
      spa: 0,
      loaded: 1
    })
    })`
  })

  const assetURL = router.assetURL('obfuscate-pii.html', { loader: 'spa', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const spaPromise = router.expectEvents(7000)

  Promise.all([rumPromise, loadPromise])
    .then(() => spaPromise)
    .then(() => t.fail('should not have received spa data'))
    .catch((e) => {
      if (e.toString().indexOf('Expect for bamServer timed out') > -1) {
        t.pass('did not received spa data :)')
      } else {
        t.fail('unknown error', e)
      }
    })
    .finally(() => t.end())
})

testDriver.test('PAGE ACTIONS - Kills feature if entitlements flag is 0', supported, function (t, browser, router) {
  const init = {
    page_action: { enabled: true, harvestTimeSeconds: 5 }
  }

  router.scheduleReply('bamServer', {
    test: testRumRequest,
    body: `NREUM.setToken(${JSON.stringify({
      stn: 1,
      err: 1,
      ins: 0,
      cap: 1,
      spa: 1,
      loaded: 1
    })
    })`
  })

  const assetURL = router.assetURL('obfuscate-pii.html', { loader: 'full', init })
  const rumPromise = router.expectRum()
  const loadPromise = browser.get(assetURL)
  const insPromise = router.expectIns(7000)

  Promise.all([rumPromise, loadPromise])
    .then(() => insPromise)
    .then(() => t.fail('should not have received spa data'))
    .catch((e) => {
      if (e.toString().indexOf('Expect for bamServer timed out') > -1) {
        t.pass('did not received ins data :)')
      } else {
        t.fail('unknown error', e)
      }
    })
    .finally(() => t.end())
})
