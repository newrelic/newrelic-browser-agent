import testDriver from '../../../tools/jil/index.es6'

let supported = testDriver.Matcher.withFeature('fetch')

testDriver.test('empty fetch does not break the agent', supported, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/fetch-empty.html', { loader: 'spa' }))

  rumPromise.then(({query}) => {
    t.ok(query.af.split(',').indexOf('spa') !== -1, 'should indicate that it supports spa')
  })

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      t.pass('events received')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
