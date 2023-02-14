const testDriver = require('../../../tools/jil/index')
const { fail, condition } = require('./helpers')
const querypack = require('@newrelic/nr-querypack')

const fetchBrowsers = testDriver.Matcher.withFeature('fetch')

testDriver.test('Disabled ajax events', function (t, browser, router) {
  const ajaxPromise = router.expectAjaxEvents(5000)
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('xhr-outside-interaction.html', {
    loader: 'spa',
    init: {
      ajax: {
        harvestTimeSeconds: 2,
        enabled: false
      }
    }
  })).waitForFeature('loaded')

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([response]) => {
      t.error()
      t.end()
    }).catch(fail)

  function fail () {
    t.ok(true, 'AJAX Promise did not execute because enabled was false')
    t.end()
  }
})

testDriver.test('capturing XHR ajax events', function (t, browser, router) {
  const ajaxPromise = router.expectAjaxEvents(5000)
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('xhr-outside-interaction.html', {
    loader: 'spa',
    init: {
      ajax: {
        harvestTimeSeconds: 2,
        enabled: true
      }
    }
  })).waitForFeature('loaded')

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(async ([{ request }]) => {
      const ajaxRequests = querypack.decode(request.body)
      t.ok(ajaxRequests.length, 'XMLHttpRequest ajax event was harvested')

      t.end()
    }).catch(fail(t))
})

testDriver.test('capturing large payload of XHR ajax events', function (t, browser, router) {
  const ajaxPromises = Promise.all([
    router.expectAjaxEvents(8000),
    router.expectAjaxEvents(16000)
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
  })).waitForFeature('loaded')

  Promise.all([ajaxPromises, loadPromise, rumPromise])
    .then(([[{ request: request1 }, { request: request2 }]]) => {
      const ajax1Requests = querypack.decode(request1.body)
      const ajax2Requests = querypack.decode(request2.body)
      t.ok(ajax1Requests)
      t.ok(ajax2Requests)
      t.end()
    }).catch(fail(t))
})

testDriver.test('capturing Fetch ajax events', fetchBrowsers, function (t, browser, router) {
  const ajaxPromise = router.expectAjaxEvents(8000)
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('fetch-outside-interaction.html', {
    loader: 'spa',
    init: {
      ajax: {
        harvestTimeSeconds: 2,
        enabled: true
      }
    }
  })).waitForFeature('loaded')

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([{ request }]) => {
      const ajaxRequests = querypack.decode(request.body)
      t.ok(ajaxRequests.length, 'Fetch ajax event was harvested')

      t.end()
    }).catch(fail(t))
})

testDriver.test('Distributed Tracing info is added to XHR ajax events', function (t, browser, router) {
  const config = {
    accountID: '1234',
    agentID: '1',
    trustKey: '1'
  }

  const ajaxPromise = router.expectAjaxEvents(8000)
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
  })).waitForFeature('loaded')

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([{ request }]) => {
      const ajaxRequests = querypack.decode(request.body)
      t.ok(ajaxRequests.length, 'XMLHttpRequest ajax event was harvested')

      const expectedAjaxRequest = ajaxRequests.find(ar => ar.path === '/json')
      t.ok(expectedAjaxRequest.guid && expectedAjaxRequest.guid.length > 0, 'should be a non-empty guid string')
      t.ok(expectedAjaxRequest.traceId && expectedAjaxRequest.traceId.length > 0, 'should be a non-empty traceId string')
      t.ok(expectedAjaxRequest.timestamp != null && expectedAjaxRequest.timestamp > 0, 'should be a non-zero timestamp')
      t.ok(expectedAjaxRequest.requestedWith === 'XMLHttpRequest', 'requested with XMLHttpRequest')

      t.end()
    }).catch(fail(t))
})

testDriver.test('Distributed Tracing info is added to Fetch ajax events', fetchBrowsers, function (t, browser, router) {
  const config = {
    accountID: '1234',
    agentID: '1',
    trustKey: '1'
  }

  const ajaxPromise = router.expectAjaxEvents(8000)
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
  })).waitForFeature('loaded')

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([{ request }]) => {
      const ajaxRequests = querypack.decode(request.body)
      t.ok(ajaxRequests.length, 'Fetch ajax event was harvested')

      const expectedAjaxRequest = ajaxRequests.find(ar => ar.path === '/json')
      t.ok(expectedAjaxRequest.guid && expectedAjaxRequest.guid.length > 0, 'should be a non-empty guid string')
      t.ok(expectedAjaxRequest.traceId && expectedAjaxRequest.traceId.length > 0, 'should be a non-empty traceId string')
      t.ok(expectedAjaxRequest.timestamp != null && expectedAjaxRequest.timestamp > 0, 'should be a non-zero timestamp')
      t.ok(expectedAjaxRequest.requestedWith === 'fetch', 'requested with fetch')

      t.end()
    }).catch(fail(t))
})
