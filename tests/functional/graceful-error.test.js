
const testDriver = require('../../tools/jil/index')
let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('agent either runs or fails gracefully', withTls, function (t, browser, router) {
  let assetURL = router.assetURL('graceful-error.html')

  let loadPromise = browser
    .safeGet(assetURL)

  Promise.all([loadPromise])
    .then(() => {
      return Promise.all([browser.safeEval('window.errorSeen'), browser.safeEval('window.someOutput')])
    })
    .then(([errorSeen, someOutput]) => {
      t.ok(someOutput, `window.someOutput was able to run (${someOutput}), even though errorsSeen was ${errorSeen}`)
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
