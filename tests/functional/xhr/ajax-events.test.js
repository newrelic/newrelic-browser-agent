const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

const xhrBrowsers = testDriver.Matcher.withFeature('xhr')
const fetchBrowsers = testDriver.Matcher.withFeature('fetch')

testDriver.test('capturing XHR ajax events', xhrBrowsers, function (t, browser, router) {
  const ajaxPromise = router.expectAjaxEvents()
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('xhr-outside-interaction.html', { loader: 'spa' }))

  Promise.all([ajaxPromise, loadPromise, rumPromise])
    .then(([response]) => {
      const {body} = response
      const ajaxEvents = querypack.decode(body)
      const ajaxEvent = ajaxEvents.find(e => e.type === 'ajax' && e.path === '/json')

      t.ok(ajaxEvent, 'XMLHttpRequest ajax event was harvested')

      t.end()
    }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('capturing Fetch ajax events', fetchBrowsers, function (t, browser, router) {
  const ajaxPromise = router.expectAjaxEvents()
  const rumPromise = router.expectRum()
  const loadPromise = browser.safeGet(router.assetURL('fetch-outside-interaction.html', { loader: 'spa' }))

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
