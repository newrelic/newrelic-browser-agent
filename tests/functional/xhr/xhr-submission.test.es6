import testDriver from '../../../tools/jil/index.es6'
import {getXhrFromResponse} from './helpers.es6'

let reliableUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')
let xhrBrowsers = testDriver.Matcher.withFeature('xhr')
let sendBeaconBrowsers = testDriver.Matcher.withFeature('sendBeacon')
let brokenBeaconBrowsers = testDriver.Matcher.withFeature('brokenSendBeacon')
let supported = xhrBrowsers.intersect(reliableUnload)

testDriver.test('capturing SPA interactions', supported, function (t, browser, router) {
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('xhr.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([response]) => {
      if (sendBeaconBrowsers.match(browser) && !brokenBeaconBrowsers.match(browser)) {
        t.equal(response.req.method, 'POST', 'XHR data submitted via POST request from sendBeacon')
        t.ok(response.body, 'request body should not be empty')
      } else {
        t.equal(response.req.method, 'GET', 'XHR data submitted via GET request')
        t.notOk(response.body, 'request body should be empty')
      }

      const parsedXhrs = getXhrFromResponse(response, browser)
      t.ok(parsedXhrs, 'has xhr data')
      t.ok(parsedXhrs.length >= 1, 'has at least one XHR record')
      t.deepEqual(['metrics', 'params'], Object.keys(parsedXhrs[0]).sort(), 'XHR record has correct keys')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
