const testDriver = require('../../../tools/jil/index')
const {workerTypes, typeToMatcher} = require('./helpers')
const {fail, failWithEndTimeout, asyncApiFns, extractWorkerSM, getMetricsFromResponse, checkPayload, url, cleanURL} = 
	require('../uncat-internal-help.cjs')

const reliableFinalHarvest = testDriver.Matcher.withFeature('reliableFinalHarvest')
const withUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')
const fetchExt = testDriver.Matcher.withFeature('fetchExt')
const nestedWorkerSupport = testDriver.Matcher.withFeature('nestedWorkers')

const FAIL_MSG = 'unexpected error';

workerTypes.forEach(type => {  // runs all test for classic & module workers & use the 'workers' browser-matcher for classic and the 'workersFull' for module
	const browsersWithOrWithoutModuleSupport = typeToMatcher(type);
	apiFinished(type, browsersWithOrWithoutModuleSupport.and(reliableFinalHarvest));
	apiAddReleaseTooMany(type, browsersWithOrWithoutModuleSupport.and(withUnload));
	apiAddReleaseTooLong(type, browsersWithOrWithoutModuleSupport.and(withUnload));
	apiAddReleaseNotUsed(type, browsersWithOrWithoutModuleSupport.and(withUnload));

	harvestReferrerSent(type, browsersWithOrWithoutModuleSupport);
	harvestSessionIsNullWhenEnabled(type, browsersWithOrWithoutModuleSupport);

	metricsApiCreatesSM(type, browsersWithOrWithoutModuleSupport.and(withUnload));
	metricsValidObfuscationCreatesSM(type, browsersWithOrWithoutModuleSupport.and(fetchExt));
	metricsInvalidObfuscationCreatesSM(type, browsersWithOrWithoutModuleSupport.and(fetchExt));
	metricsWorkersCreateSM(type, browsersWithOrWithoutModuleSupport.and(nestedWorkerSupport));

	obfuscateAll(type, browsersWithOrWithoutModuleSupport.and(fetchExt));
});

// --- API tests ---
function apiFinished (type, browserVersionMatcher) {
	testDriver.test(`${type} - finished records a PageAction`, browserVersionMatcher, 
		function (t, browser, router) {
			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					ins: { harvestTimeSeconds: 2 }
				},
				workerCommands: [`newrelic.finished()`]
			});

			let loadPromise = browser.get(assetURL);
			let insPromise = router.expectIns();

			Promise.all([loadPromise, insPromise])
			.then(( [/* loadPromise junk */, {body}] ) => {
				let insData = JSON.parse(body).ins;
				t.equal(insData.length, 1, 'exactly 1 PageAction was submitted')
				t.equal(insData[0].actionName, 'finished', 'PageAction has actionName = finished')
				t.end()
			}).catch(fail(t));
		}
	);
}
function apiAddReleaseTooMany (type, browserVersionMatcher) {
	testDriver.test(`${type} - release api adds tags to jserrors (with tags limit)`, browserVersionMatcher, 
		function (t, browser, router) {
			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					jserrors: { harvestTimeSeconds: 5 },
					metrics: { enabled: false }
				},
				workerCommands: [
					() => {
						for (let i = 1; i <= 11; i++)
							newrelic.addRelease('num'+i, i);
					},
					() => { throw new Error('error with release') }
				].map(x => x.toString())
			});

			let loadPromise = browser.get(assetURL);
			let errPromise = router.expectErrors();

			Promise.all([loadPromise, errPromise])
			.then(( [, {query}] ) => {
				const queryRi = JSON.parse(query.ri);
				const ri = {};
				for (let i = 1; i <= 10; i++) ri['num'+i] = String(i);	// 10 is the magic number (limit) defined in addRelease of api.js

				t.deepEqual(queryRi, ri, `${JSON.stringify(ri)} is expected but got ${JSON.stringify(queryRi)}`);
      	t.end()
			}).catch(fail(t));
		}
	);
}
function apiAddReleaseTooLong (type, browserVersionMatcher) {
	testDriver.test(`${type} - release api limits the length of tags`, browserVersionMatcher, 
		function (t, browser, router) {
			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					jserrors: { harvestTimeSeconds: 5 },
					metrics: { enabled: false }
				},
				workerCommands: [
					() => {
						let twoHundredOneCharacterString = 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy';
						twoHundredOneCharacterString += 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
						twoHundredOneCharacterString += 'q';
						newrelic.addRelease('one', twoHundredOneCharacterString.length);
						newrelic.addRelease(twoHundredOneCharacterString, '2');
						newrelic.addRelease('three', twoHundredOneCharacterString);
					},
					() => { throw new Error('error with release') }
				].map(x => x.toString())
			});

			let loadPromise = browser.get(assetURL);
			let errPromise = router.expectErrors();
			const ninetyNineY = 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
			const oneHundredX = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
			const twoHundredCharacterString = ninetyNineY + oneHundredX + 'q'

			Promise.all([loadPromise, errPromise])
			.then(( [, {query}] ) => {
				const queryRi = JSON.parse(query.ri);
				const ri = {
					one: '201',
					three: twoHundredCharacterString
				};
				ri[twoHundredCharacterString] = '2';

				t.equal(twoHundredCharacterString.length, 200, 'twoHundredCharacterString should be 200 characters but is ' + twoHundredCharacterString.length)
				t.deepEqual(queryRi, ri, `${JSON.stringify(ri)} is expected but got ${JSON.stringify(queryRi)}`)
      	t.end()
			}).catch(fail(t));
		}
	);
}
function apiAddReleaseNotUsed (type, browserVersionMatcher) {
	testDriver.test(`${type} - no query param when release is not set`, browserVersionMatcher, 
		function (t, browser, router) {
			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					jserrors: { harvestTimeSeconds: 5 },
					metrics: { enabled: false }
				},
				workerCommands: [
					() => { throw new Error('error with release') }
				].map(x => x.toString())
			});

			let loadPromise = browser.get(assetURL);
			let errPromise = router.expectErrors();

			Promise.all([loadPromise, errPromise])
			.then(( [, {query}] ) => {
				t.notOk('ri' in query, 'should not have ri query param')
      	t.end()
			}).catch(fail(t));
		}
	);
}

// --- Final harvest tests --- ... looking for this? Go to ./final-harvest.test.js 
// --- Framework detection tests --- ... not available right now (in worker), leave a msg after the tone (don't wait)

// --- Harvest tests ---
function harvestReferrerSent (type, browserVersionMatcher) {
	testDriver.test(`${type} - referrer attr is sent in the query string & does not include query params`, browserVersionMatcher, 
		function (t, browser, router) {
			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					ajax: { harvestTimeSeconds: 2 }
				},
				workerCommands: [ `fetch('instrumented.html')` ]
			});
			const loadPromise = browser.get(assetURL);
			const ajaxPromise = router.expectAjaxEvents();	// used in place of RUM call that dne in workers

			Promise.all([ajaxPromise, loadPromise])
			.then(( [{query, headers}] ) => {
				t.ok(query.ref, 'The query string should include the ref attribute.');

				let queryRefUrl = url.parse(query.ref);
    		t.ok(queryRefUrl.query == null, 'url in ref query param does not contain query parameters');

				// if (originOnlyReferer.inverse().match(browser.browserSpec)) {	-- this test doesn't seem to be true for workers even if it is for main
				// 	let headerUrl = url.parse(headers.referer);
    		// 	t.ok(headerUrl.query != null, 'url in referer header contains query parameters');
				// }
				t.end()
			}).catch(fail(t, FAIL_MSG));
		}
	);
}
function harvestSessionIsNullWhenEnabled (type, browserVersionMatcher) {
	testDriver.test(`${type} - session tracking (enabled by default) is in query string attributes and is 0`, browserVersionMatcher, 
		function (t, browser, router) {
			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					ajax: { harvestTimeSeconds: 2 }
				},
				workerCommands: [ `fetch('/json')` ]
			});
			const loadPromise = browser.get(assetURL);
			const ajaxPromise = router.expectAjaxEvents();	// used in place of RUM call that dne in workers

			Promise.all([ajaxPromise, loadPromise])
			.then(( [{query}] ) => {
				t.equal(query.ck, '0', "The cookie flag ('ck') should equal 0.");
    		t.equal(query.s, '0', "The session id attr 's' should be 0.");
				t.end();
			}).catch(fail(t, FAIL_MSG));
		}
	);
}

// --- Metrics tests ---
function metricsApiCreatesSM (type, browserVersionMatcher) {
	testDriver.test(`${type} - Calling a newrelic[api] fn creates a supportability metric`, browserVersionMatcher, 
		function (t, browser, router) {
			const EXPECTED_APIS_CALLED = asyncApiFns.length;
			t.plan(EXPECTED_APIS_CALLED + 5);	// the magic number 5 comes from the "extra" assertions labeled below		~YW, *cli 10/22

			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					jserrors: { enabled: false }
				},
				workerCommands: [() => { 
					newrelic.noticeError('too many free taco coupons')
					newrelic.setPageViewName('test')
					newrelic.setCustomAttribute('test')
					newrelic.setErrorHandler()
					newrelic.finished()
					newrelic.addToTrace('test')
					newrelic.addRelease('test')

					newrelic.setPageViewName('test')
					newrelic.setPageViewName('test')
					newrelic.setPageViewName('test')
					newrelic.setPageViewName('test')
				}].map(x => x.toString())
			});
			const loadPromise = browser.get(assetURL);
			const errPromise = router.expectErrors();
			const observedAPImetrics = [];

			Promise.all([errPromise, loadPromise])
			.then(( [data] ) => {
				const supportabilityMetrics = getMetricsFromResponse(data, true)
				const customMetrics = getMetricsFromResponse(data, false)
				t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')	// extra #1
				t.ok(customMetrics && !!customMetrics.length, 'CustomMetrics object(s) were generated')	// extra #2

				for (const sm of supportabilityMetrics) {
					const matchIdx = asyncApiFns.findIndex(x => x === sm.params.name);
					if (matchIdx != -1) observedAPImetrics.push(asyncApiFns[matchIdx]);

					if (matchIdx == 1)	// this is the index of 'setPageViewName' in asyncApiFns
						t.equal(sm.stats.c, 5, sm.params.name + ' count was incremented by 1 until reached 5');
					else if (sm.params.name.startsWith('Workers/'))	// these metrics have a dynamic count & are tested separately anyways
						continue;
					else 
						t.equal(sm.stats.c, 1, sm.params.name + ' count was incremented by 1');	// there should be 1 generic sm for agent version--extra #3
				}
				t.ok(observedAPImetrics.length === EXPECTED_APIS_CALLED, 'Saw all asyncApiFns')	// extra #4
				t.ok(customMetrics[0].params.name === 'finished', 'a `Finished` Custom Metric (cm) was also generated')	// extra #5
				t.end()
			}).catch(failWithEndTimeout(t));
		}
	);
}
function metricsValidObfuscationCreatesSM (type, browserVersionMatcher) {
	testDriver.test(`${type} - a valid obfuscationRule creates detected supportability metric`, browserVersionMatcher, 
		function (t, browser, router) {
			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					obfuscate: [{
						regex: /pii/g,
						replacement: 'OBFUSCATED'
					}],
					ajax: { harvestTimeSeconds: 2 },
					jserrors: { enabled: false },
					ins: { harvestTimeSeconds: 2 }
				},
				workerCommands: [() => { 
					setTimeout(function () {
						fetch('/tests/assets/obfuscate-pii-valid.html')
						throw new Error('pii')
					}, 100);
					newrelic.addPageAction('pageactionpii');
    			newrelic.setCustomAttribute('piicustomAttribute', 'customAttribute');
				}].map(x => x.toString())
			});
			const loadPromise = browser.get(assetURL);
			const errPromise = router.expectErrors();

			Promise.all([errPromise, loadPromise])
			.then(( [data] ) => {
				const supportabilityMetrics = getMetricsFromResponse(data, true)
				t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
				supportabilityMetrics.forEach(sm => {
					t.ok(!sm.params.name.includes('Generic/Obfuscate/Invalid'), sm.params.name + ' contains correct name')
				})
				t.end()
			}).catch(failWithEndTimeout(t));
		}
	);
}
function metricsInvalidObfuscationCreatesSM (type, browserVersionMatcher) {
	const badObfusRulesArr = [{
		regex: 123,
		replacement: 'invalid;type'		// #1 - invalid regex object
	}, {
		replacement: 'invalid,undefined'	// #2 - regex undefined
	}, {
		regex: /backslash/g,
		replacement: 123			// #3 - invalid replacement type (string)
	}];

	for (badRuleNum in badObfusRulesArr)
		testDriver.test(`${type} - invalid obfuscation rule #${parseInt(badRuleNum)+1} creates invalid supportability metric`, browserVersionMatcher, 
			function (t, browser, router) {
				let assetURL = router.assetURL(`worker/${type}-worker.html`, {
					init: {
						obfuscate: [badObfusRulesArr[badRuleNum]],
						ajax: { harvestTimeSeconds: 2 },
						jserrors: { enabled: false },
						ins: { harvestTimeSeconds: 2 }
					},
					workerCommands: [() => { 
						setTimeout(function () {
							fetch('/tests/assets/obfuscate-pii-valid.html')
							throw new Error('pii')
						}, 100);
						newrelic.addPageAction('pageactionpii');
						newrelic.setCustomAttribute('piicustomAttribute', 'customAttribute');
					}].map(x => x.toString())
				});

				const loadPromise = browser.get(assetURL);
				const errPromise = router.expectErrors();

				Promise.all([errPromise, loadPromise])
				.then(( [data] ) => {
					const supportabilityMetrics = getMetricsFromResponse(data, true)
					t.ok(supportabilityMetrics && !!supportabilityMetrics.length, 'SupportabilityMetrics object(s) were generated')
					let invalidDetected = false;
					supportabilityMetrics.forEach(sm => {
						if (sm.params.name.includes('Generic/Obfuscate/Invalid')) invalidDetected = true;
					})
					t.ok(invalidDetected, 'an invalid regex rule detected')
					t.end()
				}).catch(failWithEndTimeout(t));
			}
		);
}
function metricsWorkersCreateSM (type, browserVersionMatcher) {
	testDriver.test(`${type} - workers creation generates sm`, browserVersionMatcher, 
		function (t, browser, router) {
			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					jserrors: { enabled: false }
				},
				workerCommands: [() => { 
					try {
            let worker1 = new Worker('./worker-scripts/simple.js');
            let worker2 = new Worker('./worker-scripts/simple.js', {type: 'module'});
					} catch (e) {
							console.warn(e);
					}
					try {
            let worker1 = new SharedWorker('./worker-scripts/simple.js');
            let worker2 = new SharedWorker('./worker-scripts/simple.js', {type: 'module'});
					} catch (e) {
							console.warn(e);
					}
					try {
            let worker1 = self.navigator.serviceWorker.register('./worker-scripts/simple.js');  // This script will probably cause an error
            let worker2 = self.navigator.serviceWorker.register('./worker-scripts/simple.js', {type: 'module'});
					} catch (e) {
							console.warn(e);
					}
				}].map(x => x.toString())
			});
			const loadPromise = browser.get(assetURL);
			const errPromise = router.expectErrors();

			Promise.all([errPromise, loadPromise])
			.then(( [data] ) => {
				const supportabilityMetrics = getMetricsFromResponse(data, true)
				t.ok(supportabilityMetrics && !!supportabilityMetrics.length, `${supportabilityMetrics.length} SupportabilityMetrics object(s) were generated`);
				
				const wsm = extractWorkerSM(supportabilityMetrics);

				// Since this test is supposed to run inside a worker, there's no need to check if we're in a worker compat browser & version...
				if (!wsm.workerImplFail) {  // worker may be avail in Chrome v4, but our SM implementation may not be supported until v60, etc.
					t.ok(wsm.classicWorker, 'classic worker is expected and used');
					t.ok(wsm.moduleWorker, 'module worker is expected and used');	// see note on this from original metrics.test.js test
				}

				// NOTE: we're only testing (default|module) *dedicated* workers right now, not shared or service
				// The sharedWorker class is actually n/a inside of workers...
				t.notOk(wsm.classicShared, 'classic sharedworker is NOT expected but used');
				t.notOk(wsm.moduleShared, 'module sharedworker is NOT expected but used');
				t.notOk(wsm.sharedUnavail || wsm.sharedImplFail, 'sharedworker supportability should not be emitted by or within a worker');

				// Don't think the serviceWorker class is or will be available inside of workers either...
				t.notOk(wsm.classicService || wsm.moduleService, 'classic or module serviceworker is NOT expected or used');
				t.notOk(wsm.serviceUnavail || wsm.serviceImplFail, 'serviceworker supportability should not be emitted by or within a worker');

				t.end()
			}).catch(failWithEndTimeout(t));
		}
	);
}

// --- Nav cookie tests --- ... how has this not been yanked out from the repo yet?

// --- Obfuscate test ---
function obfuscateAll (type, browserVersionMatcher) {
	testDriver.test(`${type} - Obfuscate All Events`, browserVersionMatcher, 
		function (t, browser, router) {
			// CAUTION: RegExp objs must be explicitly stringified to be transferred, and atm our code reads it as a RegExp rather than a string
			let assetURL = router.assetURL(`worker/${type}-worker.html`, {
				init: {
					obfuscate: [{
						regex: /bam-test/g,
						replacement: 'OBFUSCATED'
					}, {
						regex: /fakeid/g
					}, {
						regex: /pii/g,
						replacement: 'OBFUSCATED'
					}, {
						regex: 'comma',
						replacement: 'invalid,string'
					}, {
						regex: 'semicolon',
						replacement: 'invalid;string'
					}, {
						regex: 'backslash',
						replacement: 'invalid\\string'
					}],
					ajax: { harvestTimeSeconds: 2 },
					jserrors: { harvestTimeSeconds: 2 },
					ins: { harvestTimeSeconds: 2 },
					metrics: { enabled: false }
				},
				workerCommands: [() => { 
					setTimeout(function () {
						fetch('/tests/assets/obfuscate-pii-valid.html')
						throw new Error('pii,fakeid')
					}, 100);
					newrelic.addPageAction('fakeidpageactionpii');
   				newrelic.setCustomAttribute('customAttribute', 'fakeid,pii');
				}].map(x => x.toString())
			});

			let loadPromise = browser.get(assetURL);
			const ajaxPromise = router.expectAjaxEvents();
			const errorsPromise = router.expectErrors();
			const insPromise = router.expectIns();

			Promise.all([loadPromise, ajaxPromise, errorsPromise, insPromise])
			.then(( [, ajaxResponse, errorsResponse, insResponse] ) => {
				checkPayload(t, ajaxResponse.body, 'AJAX')
				checkPayload(t, errorsResponse.body, 'Errors')
				checkPayload(t, insResponse.body, 'INS body')
				checkPayload(t, errorsResponse.query, 'Errors query')
				checkPayload(t, insResponse.query, 'INS query')
      	t.end()
			}).catch(fail(t));
		}
	);
}

// --- Timings tests --- ... PVT not applicable to workers