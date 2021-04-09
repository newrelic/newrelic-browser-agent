import testDriver from '../../../tools/jil/index.es6'
import querypack from '@newrelic/nr-querypack'

let supported = testDriver.Matcher.withFeature('fetch')
  .exclude('opera@<=12') // Sauce Labs Opera doesn't trust our cert

testDriver.test('DT payload is NOT added when the feature is not enabled (default)', supported, function (t, browser, router) {
  t.plan(4)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/dt/fetch-dt-harvest-disabled.html', { loader: 'spa', injectUpdatedLoaderConfig: true }))

  Promise.all([loadPromise, eventsPromise, rumPromise])
    .then((data) => {
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
    .then(({query, body}) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      var xhr = interactionTree.children[0]
      t.notOk(xhr.guid, 'should not have a guid')
      t.notOk(xhr.traceId, 'should not have a traceId')
      t.notOk(xhr.timestamp, 'should not have a timestamp')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('fetch request using string URL with two parameters on same origin has AJAX request with DT payload', supported, function (t, browser, router) {
  t.plan(4)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/dt/fetch-dt-harvest-enabled-stringurl-two-params.html', { loader: 'spa', injectUpdatedLoaderConfig: true }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(() => {
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
    .then(({query, body}) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      var xhr = interactionTree.children[0]
      t.ok(xhr.guid && xhr.guid.length > 0, 'should be a non-empty guid string')
      t.ok(xhr.traceId && xhr.traceId.length > 0, 'should be a non-empty traceId string')
      t.ok(xhr.timestamp != null && xhr.timestamp > 0, 'should be a non-zero timestamp')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('fetch request using string URL with one parameter on same origin has AJAX request with DT payload', supported, function (t, browser, router) {
  t.plan(4)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/dt/fetch-dt-harvest-enabled-stringurl-one-param.html', { loader: 'spa', injectUpdatedLoaderConfig: true }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(() => {
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
    .then(({query, body}) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      var xhr = interactionTree.children[0]
      t.ok(xhr.guid && xhr.guid.length > 0, 'should be a non-empty guid string')
      t.ok(xhr.traceId && xhr.traceId.length > 0, 'should be a non-empty traceId string')
      t.ok(xhr.timestamp != null && xhr.timestamp > 0, 'should be a non-zero timestamp')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('fetch request using object URL on same origin has AJAX request with DT payload', supported, function (t, browser, router) {
  t.plan(4)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/dt/fetch-dt-harvest-enabled-objecturl.html', { loader: 'spa', injectUpdatedLoaderConfig: true }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(() => {
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
    .then(({query, body}) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      var xhr = interactionTree.children[0]
      t.ok(xhr.guid && xhr.guid.length > 0, 'should be a non-empty guid string')
      t.ok(xhr.traceId && xhr.traceId.length > 0, 'should be a non-empty traceId string')
      t.ok(xhr.timestamp != null && xhr.timestamp > 0, 'should be a non-zero timestamp')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('fetch request on different origin has no AJAX request with DT payload', supported, function (t, browser, router) {
  t.plan(4)

  let rumPromise = router.expectRum()
  let eventsPromise = router.expectEvents()
  let loadPromise = browser.safeGet(router.assetURL('spa/dt/fetch-dt-harvest-enabled-different-origin.html', { loader: 'spa', injectUpdatedLoaderConfig: true }))

  Promise.all([eventsPromise, rumPromise, loadPromise])
    .then(() => {
      let eventPromise = router.expectEvents()
      let domPromise = browser.elementByCssSelector('body').click()

      return Promise.all([eventPromise, domPromise]).then(([eventData, domData]) => {
        return eventData
      })
    })
    .then(({query, body}) => {
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      t.equal(interactionTree.children.length, 1, 'expected one child node')

      var xhr = interactionTree.children[0]
      t.notOk(xhr.guid, 'should not have a guid')
      t.notOk(xhr.traceId, 'should not have a traceId')
      t.notOk(xhr.timestamp, 'should not have a timestamp')
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
