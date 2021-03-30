import testDriver from '../../../tools/jil/index.es6'

const asserters = testDriver.asserters

testDriver.test('RUM ', function (t, browser, router) {
  t.plan(1)

  let url = router.assetURL('ee-drains-with-no-rum-response.html')

  browser.get(url)
    .waitFor(asserters.jsCondition('window.hasRum'))
    .safeEval('__nr_require("ee").backlog', function (err, backlog) {
      if (err) throw (err)
      t.notOk(backlog.api, 'ee buffer should be empty')
    })
    .catch(fail)

  router.expectCustomGet('/1/{key}', (req, res) => { res.end('window.hasRum = true') })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
