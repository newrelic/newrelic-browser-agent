import testDriver from '../../../tools/jil/index.es6'
import querypack from '@newrelic/nr-querypack'

let supported = testDriver.Matcher.withFeature('wrappableAddEventListener')
  .exclude('opera@<=12') // Sauce Labs Opera doesn't trust our cert

testDriver.test('onreadystatechange only called once with zone.js', supported, function (t, browser, router) {
  t.plan(6)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/zonejs-on-ready-state-change.html', { loader: 'spa' }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(([eventsResult]) => {
      let {body, query} = eventsResult
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]

      t.equal(interactionTree.trigger, 'initialPageLoad', 'initial page load should be tracked with an interaction')
      t.equal(interactionTree.children.length, 2, 'expect no child nodes')
      t.notOk(interactionTree.isRouteChange, 'The interaction does not include a route change.')
      t.equal(interactionTree.children[0].type, 'stringAttribute')
      t.equal(interactionTree.children[0].key, 'counts')
      // the counts custom attribute is an array of number of times onreadystatechage is called
      // for each state.  state 1 and 3 may be called more than once, 2 and 4 should be called
      // exactly once
      t.ok(interactionTree.children[0].value.match(/^\[0,\d,1,\d,1\]$/), 'onreadystate called expected number of times')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
