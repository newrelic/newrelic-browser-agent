const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')

// Used to initialize the agent in the asset page.
const init = {
  metrics: {
    enabled: false
  },
  page_view_timing: {
    enabled: false
  },
  ajax: {
    harvestTimeSeconds: 1, // Speed up harvest.
    enabled: true
  }
}

/**
 * Data URLs should not be included in XHR collection. In addition, because these are not typical URLs with a hostname,
 * the agent must be able to handle them gracefully. This test confirms that no event is collected for the page's XHR
 * call to a data URL and that the the data URL does not cause the agent to fail before the next harvest.
 */
testDriver.test('Ignoring data url XHR events.', function (t, browser, router) {
  let url = router.assetURL('xhr-data-url.html', { loader: 'full', init })

  const loadPromise = browser.get(url)
  const rumPromise = router.expectRum()

  Promise.all([loadPromise, rumPromise])
    .then(() => {
      return router.expectAjaxEvents()
    })
    .then(({ request }) => {
      const qpData = querypack.decode(request.body)
      const ajaxEvent = qpData.find(qpd => qpd.type === 'ajax' && qpd.domain === 'undefined:undefined')
      if (ajaxEvent) {
        // A payload here is unwanted because data URLs should not be included in XHR collection.
        t.fail('Should not have received an XHR event with undefined hostname.')
      } else {
        t.pass('Did not receive an XHR event for data URL.')
      }

      return router.expectAjaxEvents()
    })
    .then(({ request }) => {
      const qpData = querypack.decode(request.body)
      const harvestEvent = qpData.find(qpd => qpd.type === 'ajax' && qpd.path.startsWith('/events'))
      if (harvestEvent) {
        // A payload here is wanted.
        t.pass('Received events harvest.')
      } else {
        t.fail('Did not receive events harvest.')
      }
      t.end()
    })
    .catch((e) => {
      t.error(e)
      t.end()
    })
})
