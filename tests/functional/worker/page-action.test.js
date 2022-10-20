const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')
const { validatePageActionData, fail } = require('../ins/ins-internal-help.cjs')	// shared helpers

const corsBrowsers = testDriver.Matcher.withFeature('cors')
const reliableFinalHarvest = testDriver.Matcher.withFeature('reliableFinalHarvest')
const xhrWithAddEventListener = testDriver.Matcher.withFeature('xhrWithAddEventListener')

workerTypes.forEach(type => {  // runs all test for classic & module workers
	paSubmission(type, typeToMatcher(type));	// use the 'workers' browser-matcher for classic and the 'workersFull' for module
});

// --- Tests ---
function paSubmission (type, supportRegOrESMWorker) {
	testDriver.test(`${type} - addPageAction sends PA event`, corsBrowsers.and(supportRegOrESMWorker), function (t, browser, router) {
		let assetURL = router.assetURL(`worker/${type}-worker.html`, {
			init: {
				ins: { harvestTimeSeconds: 5 }
			},
      workerCommands: [`newrelic.addPageAction("DummyEvent", { free: "tacos" })`]
    });

		let loadPromise = browser.get(assetURL);
		let insPromise = router.expectIns();

		Promise.all([loadPromise, insPromise])
		.then(( [/* loadPromise junk */, {req, query, body}] ) => {
      t.equal(req.method, 'POST', 'first PageAction submission is a POST')
      t.notOk(query.ins, 'query string does not include ins parameter')
      validatePageActionData(t, JSON.parse(body).ins, query)
      t.end()
    }).catch(fail(t));
	});
}