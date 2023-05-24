
const testDriver = require('../../../tools/jil/index')
let notSafariWithSeleniumBug = testDriver.Matcher.withFeature('notSafariWithSeleniumBug')

testDriver.test(`Session object exists when config is set after loader`, notSafariWithSeleniumBug, function (t, browser, router) {
  let url = router.assetURL('custom-attribute-race-condition.html', {init: {jserrors: {enabled: true, harvestTimeSeconds: 5}}})

  let loadPromise = browser.get(url)
  let rumPromise = router.expectRum()
  var errorsPromise = router.expectErrors()

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      var domPromise = browser.get(url) // forces harvest
      return Promise.all([errorsPromise, domPromise])
    })
    .then(([{ request: {query} }]) => {
      t.ok(query.s !== '0', 'Session ID exists')
      t.end()
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})