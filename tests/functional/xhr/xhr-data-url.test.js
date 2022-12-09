const testDriver = require('../../../tools/jil/index')

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
 * Takes an iterable (e.g., array) of promises and returns a single promise that fulfills when all
 * the input's promises fulfill; or if the specified milliseconds have elapsed first, returns a
 * single promise that fulfills with a value of `undefined`.
 * @param {Promise[]} promises - iterable (e.g. array) of promises to be resolved.
 * @param {number} ms - milliseconds before resolving with undefined.
 * @returns 
 */
var timedPromiseAll = (promises, ms) => Promise.race([
  new Promise((resolve) => {
    setTimeout(() => resolve(), ms)
  }),
  Promise.all(promises)
])

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
      // XHR events harvest every 1 second. If 2 seconds pass and the promise is not resolved, no XHR response was received.
      const ajaxPromise = router.expectSpecificEvents({ condition: (e) => e.type === 'ajax' && e.domain === 'undefined:undefined' })
      return timedPromiseAll([ajaxPromise], 2000)
    })
    .then((response) => {
      if (response) {
        // A payload here is unwanted because data URLs should not be included in XHR collection.
        t.fail(`Should not have received an XHR event with undefined hostname.`)
      } else {
        t.pass(`Did not receive an XHR event for data URL.`)
      }
      // XHR events harvest every 1 second. If 2 seconds pass and the promise is not resolved, no XHR response was received.
      const harvestPromise = router.expectSpecificEvents({ condition: (e) => e.type === 'ajax' && e.path.substring(0, 7) === '/events' })
      return timedPromiseAll([harvestPromise], 2000)
    })
    .then((response) => {
      if (response) {
        // A payload here is wanted.
        t.pass(`Received events harvest.`)
      } else {
        t.fail(`Did not receive events harvest.`)
      }
      t.end()
    })
    .catch((e) => {
      t.error(e)
      t.end()
    })
})
