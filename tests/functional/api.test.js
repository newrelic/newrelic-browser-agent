/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const {getErrorsFromResponse} = require('./err/assertion-helpers')

let withUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')
let withCors = testDriver.Matcher.withFeature('cors')
let withTls = testDriver.Matcher.withFeature('tls')
let reliableFinalHarvest = testDriver.Matcher.withFeature('reliableFinalHarvest')

testDriver.test('customTransactionName 1 arg', withTls, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      t.equal(
        data.query.ct,
        'http://custom.transaction/foo',
        'Custom Transaction Name (1 arg)'
      )

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('customTransactionName 1 arg unload', withUnload, function (t, browser, router) {
  t.plan(3)

  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('api.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([{body, query}]) => {
      const time = getTime(body ? JSON.parse(body).cm : JSON.parse(query.cm))
      t.equal(
        query.ct,
        'http://custom.transaction/foo',
        'Custom Transaction Name (1 arg)'
      )
      t.equal(typeof time, 'number', 'Finished exists XHR (1 arg)')
      t.ok(time > 0, 'Finished time XHR > 0 (1 arg)')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('customTransactionName 2 arg', withUnload, function (t, browser, router) {
  t.plan(3)

  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('api2.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([{body, query}]) => {
      const time = getTime(body ? JSON.parse(body).cm : JSON.parse(query.cm))
      t.equal(
        query.ct,
        'http://bar.baz/foo',
        'Custom Transaction Name (2 arg)'
      )
      t.equal(typeof time, 'number', 'Finished exists XHR (2 arg)')

      if (browser.match('firefox@<=19')) {
        t.skip('old firefox has inconsistent timing data')
      } else {
        t.ok(time > 0, 'Finished time XHR > 0 (2 arg)')
      }
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

function getTime (cm) {
  try {
    return cm[0].metrics.time.t
  } catch (e) {
    console.error(e)
    return 0
  }
}

testDriver.test('noticeError takes an error object', withUnload, function (t, browser, router) {
  t.plan(2)
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('api.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var errorData = getErrorsFromResponse(data, browser)
      var params = errorData[0] && errorData[0]['params']
      if (params) {
        var exceptionClass = params.exceptionClass
        var message = params.message
        t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string.')
        t.equal('no free taco coupons', message, 'Params contain the right error message.')
        t.end()
      } else {
        fail('No error data was received.')
      }
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('noticeError takes a string', withUnload, function (t, browser, router) {
  t.plan(2)
  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(router.assetURL('api/noticeError.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(([data]) => {
      var errorData = getErrorsFromResponse(data, browser)
      var params = errorData[0] && errorData[0]['params']
      if (params) {
        var exceptionClass = params.exceptionClass
        var message = params.message
        t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string.')
        t.equal('too many free taco coupons', message, 'Params contain the right error message.')
        t.end()
      } else {
        fail('No error data was received.')
      }
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('finished records a PageAction when called before RUM message', withCors.and(reliableFinalHarvest), function (t, browser, router) {
  let rumPromise = router.expectRum()
  let insPromise = router.expectIns()
  let loadPromise = browser.get(router.assetURL('api/finished.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      ins: {
        harvestTimeSeconds: 2
      }
    }
  }))

  Promise.all([insPromise, rumPromise, loadPromise])
    .then(([insData, rumData]) => {
      const query = insData.query
      const body = insData.body
      if (query.ins) {
        insData = JSON.parse(query.ins)
      } else {
        insData = JSON.parse(body).ins
      }

      t.equal(insData.length, 1, 'exactly 1 PageAction was submitted')
      t.equal(insData[0].actionName, 'finished', 'PageAction has actionName = finished')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('release api adds releases to jserrors', withUnload, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/release.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      let errorPromise = router.expectErrors()
      let loadPromise = browser.get(router.assetURL('/'))

      return Promise.all([errorPromise, loadPromise]).then(([errorData]) => {
        return errorData
      })
    })
    .then(({query, body}) => {
      t.equal(query.ri, '{"example":"123","other":"456"}', 'should have expected value for ri query param')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('release api limits releases to jserrors', withUnload, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/release-too-many.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      let errorPromise = router.expectErrors()
      let loadPromise = browser.get(router.assetURL('/'))

      return Promise.all([errorPromise, loadPromise]).then(([errorData]) => {
        return errorData
      })
    })
    .then(({query, body}) => {
      const queryRi = JSON.parse(query.ri)
      const ri = {
        one: '1',
        two: '2',
        three: '3',
        four: '4',
        five: '5',
        six: '6',
        seven: '7',
        eight: '8',
        nine: '9',
        ten: '10'
      }
      t.deepEqual(queryRi, ri, `${JSON.stringify(ri)} is expected but got ${JSON.stringify(queryRi)}`)
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('release api limits release size to jserrors', withUnload, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/release-too-long.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      let errorPromise = router.expectErrors()
      let loadPromise = browser.get(router.assetURL('/'))

      return Promise.all([errorPromise, loadPromise]).then(([errorData]) => {
        return errorData
      })
    })
    .then(({query, body}) => {
      const ninetyNineY = 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
      const oneHundredX = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      const twoHundredCharacterString = ninetyNineY + oneHundredX + 'q'
      const ri = {
        one: '201',
        three: twoHundredCharacterString
      }
      ri[twoHundredCharacterString] = '2'
      const queryRi = JSON.parse(query.ri)
      t.equal(twoHundredCharacterString.length, 200, 'twoHundredCharacterString should be 200 characters but is ' + twoHundredCharacterString.length)
      t.deepEqual(queryRi, ri, `${JSON.stringify(ri)} is expected but got ${JSON.stringify(queryRi)}`)
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('no query param when release is not set', withUnload, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/no-release.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([loadPromise, rumPromise])
    .then(() => {
      let errorPromise = router.expectErrors()
      let loadPromise = browser.get(router.assetURL('/'))

      return Promise.all([errorPromise, loadPromise]).then(([errorData]) => {
        return errorData
      })
    })
    .then(({query, body}) => {
      t.notOk('ri' in query, 'should not have ri query param')
      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
