import testDriver from '../../../tools/jil/index.es6'
let withTls = testDriver.Matcher.withFeature('tls')

testDriver.test('rum feature flags, full loader', withTls, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', {loader: 'full'}))

  Promise.all([rumPromise, loadPromise]).then(([{query}]) => {
    if (!browser.hasFeature('xhr')) {
      t.equal(query.af, 'err,ins')
    } else if (!browser.hasFeature('stn')) {
      t.equal(query.af, 'err,xhr,ins')
    } else {
      t.equal(query.af, 'err,xhr,stn,ins')
    }
    t.end()
  }).catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})

testDriver.test('rum feature flags, dev loader', withTls, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', {loader: 'dev'}))

  Promise.all([rumPromise, loadPromise]).then(([{query}]) => {
    var flags = ['err']
    if (browser.hasFeature('xhr')) {
      flags.push('xhr')
    }

    if (browser.hasFeature('stn')) {
      flags.push('stn')
    }

    flags.push('ins')

    if (browser.hasFeature('addEventListener')) {
      flags.push('spa')
    }

    t.equal(query.af, flags.join(','))
    t.end()
  }).catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})

testDriver.test('rum feature flags, stn loader', withTls, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', {loader: 'stn'}))

  Promise.all([rumPromise, loadPromise]).then(([{query}]) => {
    if (!browser.hasFeature('xhr')) {
      t.equal(query.af, 'err')
    } else if (!browser.hasFeature('stn')) {
      t.equal(query.af, 'err,xhr')
    } else {
      t.equal(query.af, 'err,xhr,stn')
    }
    t.end()
  }).catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})

testDriver.test('rum feature flags, xhr loader', withTls, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', {loader: 'xhr'}))

  Promise.all([rumPromise, loadPromise]).then(([{query}]) => {
    if (!browser.hasFeature('xhr')) {
      t.equal(query.af, 'err')
    } else {
      t.equal(query.af, 'err,xhr')
    }
    t.end()
  }).catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})

testDriver.test('rum feature flags, rum loader', withTls, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('rum-data.html', {loader: 'rum'}))

  Promise.all([rumPromise, loadPromise]).then(([{query}]) => {
    t.equal(query.af, void 0)
    t.end()
  }).catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})
