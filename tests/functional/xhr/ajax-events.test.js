const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

const xhrBrowsers = testDriver.Matcher.withFeature('xhr')
const fetchBrowsers = testDriver.Matcher.withFeature('fetch')

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

  function fail () {
    router.timeout = router.router.timeout = 32000
    t.ok(true, 'AJAX Promise did not execute because enabled was false')
    t.end()
  }
})

testDriver.test('capturing XHR ajax events', xhrBrowsers, function (t, browser, router) {
  const ajaxPromise = router.expectAjaxEvents()
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
    .then(([response]) => {
      const {body, query} = response
      const ajaxEvents = querypack.decode(body && body.length ? body : query.e)

      const ajaxEvent = ajaxEvents.find(e => e.type === 'ajax' && e.path === '/json')
      t.ok(ajaxEvent, 'XMLHttpRequest ajax event was harvested')

      t.end()
    }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('capturing large payload of XHR ajax events', xhrBrowsers, function (t, browser, router) {
  const ajaxPromise = router.expectAjaxEvents()
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

  let ajaxBundles = 0

  function parseAjaxPromise(response) {
    const {body, query} = response
    const decoded = querypack.decode(body && body.length ? body : query.e)
    const ajaxEvents = decoded.filter(e => e.type === 'ajax' && e.path === '/json')
    if (ajaxEvents.length) ajaxBundles++
    if (ajaxBundles < 2) router.expectAjaxEvents().then(r => parseAjaxPromise(r))
    else {
      t.ok(ajaxBundles > 1, 'AJAX load is split into multiple payloads and sent')
      t.end()
    }
  }

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([response]) => {
      parseAjaxPromise(response)
    }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('capturing Fetch ajax events', fetchBrowsers, function (t, browser, router) {
  const ajaxPromise = router.expectAjaxEvents()
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
      const {body} = response
      const ajaxEvents = querypack.decode(body)
      const ajaxEvent = ajaxEvents.find(e => e.type === 'ajax' && e.path === '/json')

      t.ok(ajaxEvent, 'Fetch ajax event was harvested')

      t.end()
    }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
