/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')
const { fail, getTime } = require('./uncat-internal-help.cjs')
const { getErrorsFromResponse } = require('./err/assertion-helpers')

const asserters = testDriver.asserters
let withUnload = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('customTransactionName 1 arg', function (t, browser, router) {
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
    .then(([{ request }]) => {
      t.equal(
        request.query.ct,
        'http://custom.transaction/foo',
        'Custom Transaction Name (1 arg)'
      )

      t.end()
    })
    .catch(fail(t))
})

testDriver.test('customTransactionName 1 arg unload', withUnload, function (t, browser, router) {
  t.plan(3)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.get(router.assetURL('/'))
      return router.expectMetrics(3000)
    })
    .then(({ request: { body, query } }) => {
      const time = getTime(body ? JSON.parse(body)?.cm : JSON.parse(query.cm))
      t.equal(
        query.ct,
        'http://custom.transaction/foo',
        'Custom Transaction Name (1 arg)'
      )
      t.equal(typeof time, 'number', 'Finished exists XHR (1 arg)')
      t.ok(time > 0, 'Finished time XHR > 0 (1 arg)')
      t.end()
    })
    .catch(fail(t))
})

testDriver.test('customTransactionName 2 arg', withUnload, function (t, browser, router) {
  t.plan(3)

  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api2.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      jserrors: {
        enabled: false
      }
    }
  }))

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      browser.get(router.assetURL('/'))
      return router.expectMetrics(3000)
    })
    .then(({ request: { body, query } }) => {
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
    .catch(fail(t))
})

testDriver.test('noticeError takes an error object', withUnload, function (t, browser, router) {
  t.plan(2)
  let rumPromise = router.expectRum()
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(router.assetURL('api.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  }))

  Promise.all([errorsPromise, rumPromise, loadPromise])
    .then(([{ request }]) => {
      var errorData = getErrorsFromResponse(request, browser)
      var params = errorData[0] && errorData[0]['params']
      if (params) {
        var exceptionClass = params.exceptionClass
        var message = params.message
        t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string.')
        t.equal('no free taco coupons', message, 'Params contain the right error message.')
        t.end()
      } else {
        fail(t)('No error data was received.')
      }
    })
    .catch(fail(t))
})

testDriver.test('noticeError takes a string', withUnload, function (t, browser, router) {
  t.plan(2)
  let rumPromise = router.expectRum()
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(router.assetURL('api/noticeError.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  }))

  Promise.all([errorsPromise, rumPromise, loadPromise])
    .then(([{ request }]) => {
      var errorData = getErrorsFromResponse(request, browser)
      var params = errorData[0] && errorData[0]['params']
      if (params) {
        var exceptionClass = params.exceptionClass
        var message = params.message
        t.equal('Error', exceptionClass, 'The agent passes an error class instead of a string.')
        t.equal('too many free taco coupons', message, 'Params contain the right error message.')
        t.end()
      } else {
        fail(t)('No error data was received.')
      }
    })
    .catch(fail(t))
})

testDriver.test('finished records a PageAction when called before RUM message', function (t, browser, router) {
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
    .then(([{ request }]) => {
      const query = request.query
      const body = request.body
      if (query.ins) {
        insData = JSON.parse(query.ins)
      } else {
        insData = JSON.parse(body).ins
      }

      t.equal(insData.length, 1, 'exactly 1 PageAction was submitted')
      t.equal(insData[0].actionName, 'finished', 'PageAction has actionName = finished')
      t.end()
    })
    .catch(fail(t))
})

testDriver.test('release api adds releases to jserrors', withUnload, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/release.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
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
    .then(({ request }) => {
      t.equal(request.query.ri, '{"example":"123","other":"456"}', 'should have expected value for ri query param')
      t.end()
    })
    .catch(fail(t))
})

testDriver.test('release api limits releases to jserrors', withUnload, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/release-too-many.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
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
    .then(({ request }) => {
      const queryRi = JSON.parse(request.query.ri)
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
    .catch(fail(t))
})

testDriver.test('release api limits release size to jserrors', withUnload, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/release-too-long.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
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
    .then(({ request }) => {
      const ninetyNineY = 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
      const oneHundredX = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      const twoHundredCharacterString = ninetyNineY + oneHundredX + 'q'
      const ri = {
        one: '201',
        three: twoHundredCharacterString
      }
      ri[twoHundredCharacterString] = '2'
      const queryRi = JSON.parse(request.query.ri)
      t.equal(twoHundredCharacterString.length, 200, 'twoHundredCharacterString should be 200 characters but is ' + twoHundredCharacterString.length)
      t.deepEqual(queryRi, ri, `${JSON.stringify(ri)} is expected but got ${JSON.stringify(queryRi)}`)
      t.end()
    })
    .catch(fail(t))
})

testDriver.test('no query param when release is not set', withUnload, function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/no-release.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
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
    .then(({ request }) => {
      t.notOk('ri' in request.query, 'should not have ri query param')
      t.end()
    })
    .catch(fail(t))
})

testDriver.test('api is available when sessionStorage is not', function (t, browser, router) {
  let rumPromise = router.expectRum()
  let loadPromise = browser.get(router.assetURL('api/session-storage-disallowed.html'))

  Promise.all([loadPromise, rumPromise])
    .then(() =>
      browser.waitFor(asserters.jsCondition('typeof window.newrelic.addToTrace === \'function\''))
    ).then((result) => {
      t.ok(result)
      t.end()
    })
    .catch(fail(t))
})
