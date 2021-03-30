import testDriver from '../../../tools/jil/index.es6'

// Opera on Sauce Labs will not trust our SSL certificate
let supportedForSSL = new testDriver.Matcher().exclude('opera').exclude('ie', '6')

testDriver.test('rum over https', supportedForSSL, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', {}))

  Promise.all([rumPromise, loadPromise]).then(([{ssl}]) => {
    t.ok(ssl)
    t.end()
  })
  .catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})

testDriver.test('rum over http uses https', supportedForSSL, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', {}))

  Promise.all([rumPromise, loadPromise]).then(([{ssl}]) => {
    t.ok(ssl)
    t.end()
  })
  .catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})
