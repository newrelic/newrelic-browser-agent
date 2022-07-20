const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')
const expectSpecificEvents = require('./helpers').expectSpecificEvents

const xhrBrowsers = testDriver.Matcher.withFeature('xhr')
const fetchBrowsers = testDriver.Matcher.withFeature('fetch')

const condition = (e) => e.type === 'ajax' && e.path === '/json'

testDriver.test('Disabled ajax events', xhrBrowsers, function (t, browser, router) {
  router.timeout = router.router.timeout = 5000
  const ajaxPromise = router.expectAjaxEvents()
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('xhr-outside-interaction.html', {
    loader: 'spa',
    init: {
      ajax: {
        harvestTimeSeconds: 2,
        enabled: false
      }
    }
  }))

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([response]) => {
      router.timeout = router.router.timeout = 32000
      t.error()
      t.end()
    }).catch(fail)

  function fail() {
    router.timeout = router.router.timeout = 32000
    t.ok(true, 'AJAX Promise did not execute because enabled was false')
    t.end()
  }
})

testDriver.test('capturing XHR ajax events', xhrBrowsers, function (t, browser, router) {
  const ajaxPromise = router.expectSpecificEvents({ condition })
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('xhr-outside-interaction.html', {
    loader: 'spa',
    init: {
      ajax: {
        harvestTimeSeconds: 2,
        enabled: true
      }
    }
  }))

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(async ([response]) => {
      t.ok(response.length, 'XMLHttpRequest ajax event was harvested')

      t.end()
    }).catch(fail)



  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('capturing large payload of XHR ajax events', xhrBrowsers, function (t, browser, router) {
  const ajaxPromises = Promise.all([
    router.expectSpecificEvents({ condition }),
    router.expectSpecificEvents({ condition })
  ])
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('xhr-large-payload.html', {
    loader: 'spa',
    init: {
      ajax: {
        harvestTimeSeconds: 5,
        maxPayloadSize: 500,
        enabled: true
      }
    }
  }))

  Promise.all([ajaxPromises, loadPromise, rumPromise])
    .then(([responses]) => {
      t.ok(responses)
      t.end()
    }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('capturing Fetch ajax events', fetchBrowsers, function (t, browser, router) {
  const ajaxPromise = router.expectSpecificEvents({ condition })
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('fetch-outside-interaction.html', {
    loader: 'spa',
    init: {
      ajax: {
        harvestTimeSeconds: 2,
        enabled: true
      }
    }
  }))

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([response]) => {
      t.ok(response.length, 'Fetch ajax event was harvested')

      t.end()
    }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('Distributed Tracing info is added to XHR ajax events', xhrBrowsers, function (t, browser, router) {
  const config = {
    accountID: '1234',
    agentID: '1',
    trustKey: '1'
  }

  const ajaxPromise = router.expectSpecificEvents({ condition })
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('xhr-outside-interaction.html', {
    loader: 'spa',
    injectUpdatedLoaderConfig: true,
    config,
    init: {
      distributed_tracing: {
        enabled: true
      },
      ajax: {
        harvestTimeSeconds: 2,
        enabled: true
      }
    }
  }))

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([response]) => {
      t.ok(response.length, 'XMLHttpRequest ajax event was harvested')
      response.forEach(r => {
        t.ok(r.guid && r.guid.length > 0, 'should be a non-empty guid string')
        t.ok(r.traceId && r.traceId.length > 0, 'should be a non-empty traceId string')
        t.ok(r.timestamp != null && r.timestamp > 0, 'should be a non-zero timestamp')
      })

      t.end()
    }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('Distributed Tracing info is added to Fetch ajax events', fetchBrowsers, function (t, browser, router) {
  const config = {
    accountID: '1234',
    agentID: '1',
    trustKey: '1'
  }

  const ajaxPromise = router.expectSpecificEvents({ condition })
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('fetch-outside-interaction.html', {
    loader: 'spa',
    injectUpdatedLoaderConfig: true,
    config,
    init: {
      distributed_tracing: {
        enabled: true
      },
      ajax: {
        harvestTimeSeconds: 2,
        enabled: true
      }
    }
  }))

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([response]) => {
      t.ok(response.length, 'Fetch ajax event was harvested')
      response.forEach(r => {
        t.ok(r.guid && r.guid.length > 0, 'should be a non-empty guid string')
        t.ok(r.traceId && r.traceId.length > 0, 'should be a non-empty traceId string')
        t.ok(r.timestamp != null && r.timestamp > 0, 'should be a non-zero timestamp')
      })

      t.end()
    }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})
