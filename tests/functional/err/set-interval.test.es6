import testDriver from '../../../tools/jil/index.es6'
import {assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse} from './assertion-helpers.es6'

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('reporting errors from setInterval callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('set-interval-error.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  })

  let rumPromise = router.expectRumAndConditionAndErrors('window.intervalFired')
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query)
    const actualErrors = getErrorsFromResponse(response, browser)
    let expectedErrors = [{
      message: 'interval callback',
      stack: [{
        u: router.assetURL('js/set-interval-error.js').split('?')[0],
        l: 5
      }]
    }]

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
