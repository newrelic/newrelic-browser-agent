const testDriver = require('jil')
const querypack = require('@newrelic/nr-querypack')

const bfCacheSupport = testDriver.Matcher.withFeature('bfcache')
const excludeIE = testDriver.Matcher.withFeature('notInternetExplorer')
function fail (t) {
  return (err) => {
    t.error(err)
    t.end()
  }
}

testDriver.test("Agent doesn't block page from back/fwd cache", bfCacheSupport, function (t, browser, router) {
  const init = {
    allow_bfcache: true
  }
  const scriptString = `window.addEventListener('pagehide', (evt) => { navigator.sendBeacon('/echo?testId=${router.testId}&persisted='+evt.persisted) });`
  const rumPromise = router.expectRum()
  const assetURL = router.assetURL('instrumented.html', { loader: 'spa', init, scriptString })
  const loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise]).then(() => {
    const beacon = router.expect('assetServer', {
      test: function (request) {
        const url = new URL(request.url, 'resolve://')
        return url.pathname === '/echo'
      }
    })
    const nav = browser.get(router.assetURL('/'))
    return Promise.all([beacon, nav])
  }).then(([{ request }]) => {
    t.ok({ ...request.query }.persisted, 'BFC persisted should be true')
    t.end()
  }).catch(fail(t))
})

testDriver.test('EOL events are sent appropriately', excludeIE, function (t, browser, router) {
  const init = {
    allow_bfcache: true	// with this, all timings except "unload" event are expected to be harvested after the first time the page becomes hidden
  }

  const assetURL = router.assetURL('pagehide.html', { loader: 'rum', init })
  const loadPromise = browser.get(assetURL)

  Promise.all([loadPromise, router.expectRum()]).then(() => {
    const timingsListener = router.expectTimings(3000)
    // 1) Make an interaction and simulate visibilitychange to trigger our "pagehide" logic after loading, after which we expect "final" harvest to occur.
    browser.elementById('btn1').click()
    return timingsListener
  }).then(({ request: pvtPayload }) => {
    // 2) Verify PageViewTimings sent sufficient expected timing events, then trigger our "unload" logic.
    const phTimings = querypack.decode(pvtPayload?.body?.length ? pvtPayload.body : pvtPayload.query.e)
    t.ok(phTimings.length > 1, 'vis hidden causes PVT harvest')	// should be more timings than "pagehide" at min -- this can increase for confidence when CLS & INP are added

    const phNode = phTimings.find(t => t.name === 'pageHide')
    t.ok(phNode.value > 0, 'vis hidden emits the pageHide event')
    const ulNode = phTimings.find(t => t.name === 'unload')
    t.equal(ulNode, undefined, "vis hidden doesn't emit unload event")

    const timingsListener = router.expectTimings()
    browser.get(router.assetURL('/'))
    return timingsListener
  }).then(({ request: pvtPayload }) => {
    // 3) Verify PVTs aren't sent again but unload event is; (TEMPORARY) pageHide event should not be sent again
    const ulTimings = querypack.decode(pvtPayload?.body?.length ? pvtPayload.body : pvtPayload.query.e)

    t.ok(ulTimings.length > 0, 'unloading causes PVT harvest')	// "unload" & ongoing CWV lib metrics like INP--if supported--should be harvested here

    const ulNode = ulTimings.find(t => t.name === 'unload')
    t.ok(ulNode.value > 0, 'window pagehide emits the unload event')
    const phNode = ulTimings.find(t => t.name === 'pageHide')
    t.equal(phNode, undefined, 'but pageHide is not emitted again (capped at one)')

    t.end()
  }).catch(fail(t))
})
