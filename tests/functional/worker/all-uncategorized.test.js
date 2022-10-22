const testDriver = require('../../../tools/jil/index')
const {workerTypes, typeToMatcher} = require('./helpers')
const {fail, checkPayload} = require('../uncat-internal-help.cjs')

const withUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')
const reliableFinalHarvest = testDriver.Matcher.withFeature('reliableFinalHarvest')
const fetchExt = testDriver.Matcher.withFeature('fetchExt')

workerTypes.forEach(type => {  // runs all test for classic & module workers & use the 'workers' browser-matcher for classic and the 'workersFull' for module
	const browsersWithOrWithoutModuleSupport = typeToMatcher(type);
	apiFinished(type, browsersWithOrWithoutModuleSupport);
	apiAddReleaseTooMany(type, browsersWithOrWithoutModuleSupport);
	apiAddReleaseTooLong(type, browsersWithOrWithoutModuleSupport);
	apiAddReleaseNotUsed(type, browsersWithOrWithoutModuleSupport);
	obfuscateAll(type, browsersWithOrWithoutModuleSupport);
});

// --- API tests ---
function apiFinished (type, supportRegOrESMWorker) {
	testDriver.test(`${type} - finished records a PageAction`, reliableFinalHarvest.and(supportRegOrESMWorker), 
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

function apiAddReleaseTooMany (type, supportRegOrESMWorker) {
	testDriver.test(`${type} - release api adds tags to jserrors (with tags limit)`, withUnload.and(supportRegOrESMWorker), 
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

function apiAddReleaseTooLong (type, supportRegOrESMWorker) {
	testDriver.test(`${type} - release api limits the length of tags`, withUnload.and(supportRegOrESMWorker), 
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

function apiAddReleaseNotUsed (type, supportRegOrESMWorker) {
	testDriver.test(`${type} - no query param when release is not set`, withUnload.and(supportRegOrESMWorker), 
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

// --- Nav cookie tests --- ... how has this not been yanked out from the repo yet?

// --- Obfuscate test ---
function obfuscateAll (type, supportRegOrESMWorker) {
	testDriver.test(`${type} - Obfuscate All Events`, fetchExt.and(supportRegOrESMWorker), 
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
						fetch('/json')
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