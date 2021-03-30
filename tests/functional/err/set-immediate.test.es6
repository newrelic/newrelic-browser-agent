import testDriver from '../../../tools/jil/index.es6'
import {assertErrorAttributes, assertExpectedErrors} from './assertion-helpers.es6'

let supported = testDriver.Matcher.withFeature('setImmediate')

testDriver.test('reporting errors from setImmediate callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('set-immediate-error.html')

  let rumPromise = router.expectRumAndConditionAndErrors('window.setImmediateFired')
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise]).then(([{query}]) => {
    assertErrorAttributes(t, query)

    let actualErrors = JSON.parse(query.err)
    let expectedErrors = [{
      message: 'immediate callback',
      stack: [{
        u: router.assetURL('js/set-immediate-error.js').split('?')[0],
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
