const testDriver = require("jil");
const querypack = require('@newrelic/nr-querypack');

const bfCacheSupport = testDriver.Matcher.withFeature('bfcache');
const excludeIE = testDriver.Matcher.withFeature('notInternetExplorer');
function fail(t) {
	return (err) => {
		t.error(err);
		t.end();
	};
}

testDriver.test("Agent doesn't block page from back/fwd cache", bfCacheSupport, function (t, browser, router) {
  const init = {
		allow_bfcache: true
  }
	const scriptString = `window.addEventListener('pagehide', (evt) => { if (evt.persisted) newrelic.addPageAction("pageCached"); });`

  const assetURL = router.assetURL('instrumented.html', { loader: 'spa', init, scriptString });
  const loadPromise = browser.get(assetURL);

  Promise.all([loadPromise, router.expectRum()]).then(() => {
		// Once the initial page loads and features are running, navigate away and check to see if it's cached via the custom pageaction being emitted w/o timing out.
    browser.get(router.assetURL('/'));
		router.timeout = 3000;
		return router.expectIns();
  }).then((pActPayload) => {
		// Double check we got the PA expected.
		const pActsReceived = JSON.parse(pActPayload.body).ins;
		t.equal(pActsReceived[0].actionName, "pageCached", "page successfully stored in bf cache");
		t.end();
	}).catch(fail(t));
})

testDriver.test("EOL events are sent appropriately", excludeIE, function (t, browser, router) {
  const init = {
		allow_bfcache: true	// with this, all timings except "unload" event are expected to be harvested after the first time the page becomes hidden
  }

  const assetURL = router.assetURL('pagehide.html', { loader: 'rum', init });
  const loadPromise = browser.get(assetURL);

  Promise.all([loadPromise, router.expectRum()]).then(() => {
		// 1) Make an interaction and simulate visibilitychange to trigger our "pagehide" logic after loading, after which we expect "final" harvest to occur.
    browser.elementById('btn1').click();
		router.timeout = 3000;
		return router.expectTimings();
  }).then((pvtPayload) => {
		// 2) Verify PageViewTimings sent sufficient expected timing events, then trigger our "unload" logic.
		const phTimings = querypack.decode(pvtPayload?.body?.length ? pvtPayload.body : pvtPayload.query.e)
		t.ok(phTimings.length > 1, "vis hidden causes PVT harvest");	// should be more timings than "pagehide" at min -- this can increase for confidence when CLS & INP are added
		
		const phNode = phTimings.find(t => t.name === 'pageHide');
		t.ok(phNode.value > 0, "vis hidden emits the pageHide event");
		const ulNode = phTimings.find(t => t.name === 'unload');
		t.equal(ulNode, undefined, "vis hidden doesn't emit unload event");

		browser.get(router.assetURL('/'));
		return router.expectTimings();
	}).then((pvtPayload) => {
		// 3) Verify PVTs aren't sent again but unload event is; (TEMPORARY) pageHide event should not be sent again
		const ulTimings = querypack.decode(pvtPayload?.body?.length ? pvtPayload.body : pvtPayload.query.e)

		t.ok(ulTimings.length == 1, "unloading causes PVT harvest");	// until BFC work is complete, only "unload" should be harvested here
		t.equal(ulTimings[0].name, "unload", "window pagehide emits the unload event (but not our pageHide again)");
		t.end();
	}).catch(fail(t));
})