import testDriver from '../../../tools/jil/index.es6'
import querypack from '@newrelic/nr-querypack'

let supported = testDriver.Matcher.withFeature('addEventListener')
  .exclude('opera@<=12') // Sauce Labs Opera doesn't trust our cert

testDriver.test('spa page urls include the hash fragment', supported, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/xhr.html', { loader: 'spa' }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData]) => {
        return eventData
      })
    })
    .then(({query, body}) => {
      // make sure the newURL has the hash change
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.ok(/#\d/.test(interactionTree.newURL), 'the url should contain the hash fragment')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
