const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')
const { fail, checkPayload, url } = require('../uncat-internal-help.cjs')

const fetchExt = testDriver.Matcher.withFeature('fetchExt')
const FAIL_MSG = 'unexpected error'

workerTypes.forEach(type => { // runs all test for classic & module workers & use the 'workers' browser-matcher for classic and the 'workersFull' for module
  const browsersWithOrWithoutModuleSupport = typeToMatcher(type)
  apiFinished(type, browsersWithOrWithoutModuleSupport)
  apiAddReleaseTooMany(type, browsersWithOrWithoutModuleSupport)
  apiAddReleaseTooLong(type, browsersWithOrWithoutModuleSupport)
  apiAddReleaseNotUsed(type, browsersWithOrWithoutModuleSupport)

  harvestReferrerSent(type, browsersWithOrWithoutModuleSupport)
  harvestSessionIsNullWhenEnabled(type, browsersWithOrWithoutModuleSupport)

  obfuscateAll(type, browsersWithOrWithoutModuleSupport.and(fetchExt))
})

// --- API tests ---
function apiFinished (type, browserVersionMatcher) {
  testDriver.test(`${type} - finished records a PageAction`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          ins: { harvestTimeSeconds: 2 }
        },
        workerCommands: ['newrelic.finished()']
      })

      let loadPromise = browser.get(assetURL)
      let insPromise = router.expectIns()
      const rumPromise = router.expectRum()

      Promise.all([loadPromise, insPromise, rumPromise])
        .then(([/* loadPromise junk */, { request: { body } }]) => {
          let insData = JSON.parse(body).ins
          t.equal(insData.length, 1, 'exactly 1 PageAction was submitted')
          t.equal(insData[0].actionName, 'finished', 'PageAction has actionName = finished')
          t.end()
        }).catch(fail(t))
    }
  )
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
            { newrelic.addRelease('num' + i, i) }
          },
          () => { throw new Error('error with release') }
        ].map(x => x.toString())
      })

      let loadPromise = browser.get(assetURL)
      let errPromise = router.expectErrors()
      const rumPromise = router.expectRum()

      Promise.all([loadPromise, errPromise, rumPromise])
        .then(([, { request: { query } }]) => {
          const queryRi = JSON.parse(query.ri)
          const ri = {}
          for (let i = 1; i <= 10; i++) ri['num' + i] = String(i)	// 10 is the magic number (limit) defined in addRelease of api.js

          t.deepEqual(queryRi, ri, `${JSON.stringify(ri)} is expected but got ${JSON.stringify(queryRi)}`)
      	t.end()
        }).catch(fail(t))
    }
  )
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
            let twoHundredOneCharacterString = 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
            twoHundredOneCharacterString += 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            twoHundredOneCharacterString += 'q'
            newrelic.addRelease('one', twoHundredOneCharacterString.length)
            newrelic.addRelease(twoHundredOneCharacterString, '2')
            newrelic.addRelease('three', twoHundredOneCharacterString)
          },
          () => { throw new Error('error with release') }
        ].map(x => x.toString())
      })

      let loadPromise = browser.get(assetURL)
      let errPromise = router.expectErrors()
      const rumPromise = router.expectRum()
      const ninetyNineY = 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
      const oneHundredX = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      const twoHundredCharacterString = ninetyNineY + oneHundredX + 'q'

      Promise.all([loadPromise, errPromise, rumPromise])
        .then(([, { request: { query } }]) => {
          const queryRi = JSON.parse(query.ri)
          const ri = {
            one: '201',
            three: twoHundredCharacterString
          }
          ri[twoHundredCharacterString] = '2'

          t.equal(twoHundredCharacterString.length, 200, 'twoHundredCharacterString should be 200 characters but is ' + twoHundredCharacterString.length)
          t.deepEqual(queryRi, ri, `${JSON.stringify(ri)} is expected but got ${JSON.stringify(queryRi)}`)
      	t.end()
        }).catch(fail(t))
    }
  )
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
      })

      let loadPromise = browser.get(assetURL)
      let errPromise = router.expectErrors()
      const rumPromise = router.expectRum()

      Promise.all([loadPromise, errPromise, rumPromise])
        .then(([, { request: { query } }]) => {
          t.notOk('ri' in query, 'should not have ri query param')
      	t.end()
        }).catch(fail(t))
    }
  )
}

// --- Final harvest tests --- ... looking for this? Go to ./eol-harvest.test.js
// --- Framework detection tests --- ... not available right now (in worker), leave a msg after the tone (don't wait)

// --- Harvest tests ---
function harvestReferrerSent (type, browserVersionMatcher) {
  testDriver.test(`${type} - referrer attr is sent in the query string & does not include query params`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          ajax: { harvestTimeSeconds: 2 }
        },
        workerCommands: ['fetch(\'instrumented.html\')']
      })
      const loadPromise = browser.get(assetURL)
      const ajaxPromise = router.expectAjaxEvents()	// used in place of RUM call that dne in workers

      Promise.all([ajaxPromise, loadPromise, router.expectRum()])
        .then(([{ request: { query } }]) => {
          t.ok(query.ref, 'The query string should include the ref attribute.')

          let queryRefUrl = url.parse(query.ref)
    		t.ok(queryRefUrl.query == null, 'url in ref query param does not contain query parameters')

          // if (originOnlyReferer.inverse().match(browser.browserSpec)) {	-- this test doesn't seem to be true for workers even if it is for main
          // 	let headerUrl = url.parse(headers.referer);
    		// 	t.ok(headerUrl.query != null, 'url in referer header contains query parameters');
          // }
          t.end()
        }).catch(fail(t, FAIL_MSG))
    }
  )
}
function harvestSessionIsNullWhenEnabled (type, browserVersionMatcher) {
  testDriver.test(`${type} - session tracking (enabled by default) is in query string attributes and is 0`, browserVersionMatcher,
    function (t, browser, router) {
      let assetURL = router.assetURL(`worker/${type}-worker.html`, {
        init: {
          ajax: { harvestTimeSeconds: 2 }
        },
        workerCommands: ['fetch(\'/json\')']
      })
      const loadPromise = browser.get(assetURL)
      const ajaxPromise = router.expectAjaxEvents()	// used in place of RUM call that dne in workers

      Promise.all([ajaxPromise, loadPromise, router.expectRum()])
        .then(([{ request: { query } }]) => {
          t.equal(query.ck, '0', "The cookie flag ('ck') should equal 0.")
    		t.equal(query.s, '0', "The session id attr 's' should be 0.")
          t.end()
        }).catch(fail(t, FAIL_MSG))
    }
  )
}

// --- Metrics tests --- ... looking for this? Go to ./metrics.test.js

// --- Nav cookie tests --- ... how has this not been yanked out from the repo yet?

// --- Obfuscate test ---
function obfuscateAll (type, browserVersionMatcher) {
  testDriver.test(`${type} - Obfuscate All Events`, browserVersionMatcher,
    function (t, browser, router) {
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
          }, 100)
          newrelic.addPageAction('fakeidpageactionpii')
   				newrelic.setCustomAttribute('customAttribute', 'fakeid,pii')
        }].map(x => x.toString())
      })

      let loadPromise = browser.get(assetURL)
      const ajaxPromise = router.expectAjaxEvents()
      const errorsPromise = router.expectErrors()
      const insPromise = router.expectIns()

      Promise.all([loadPromise, ajaxPromise, errorsPromise, insPromise, router.expectRum()])
        .then(([, ajaxResponse, errorsResponse, insResponse]) => {
          checkPayload(t, ajaxResponse.request.body, 'AJAX')
          checkPayload(t, errorsResponse.request.body, 'Errors')
          checkPayload(t, insResponse.request.body, 'INS body')
          checkPayload(t, errorsResponse.request.query, 'Errors query')
          checkPayload(t, insResponse.request.query, 'INS query')
      	t.end()
        }).catch(fail(t))
    }
  )
}

// --- Timings tests --- ... PVT not applicable to workers
