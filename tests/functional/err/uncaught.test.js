/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse } = require('./assertion-helpers')

let supported = testDriver.Matcher.withFeature('reliableUnloadEvent')

testDriver.test('reporting uncaught errors', supported, function (t, browser, router) {
  let assetURL = router.assetURL('uncaught.html', {
    init: {
      page_view_timing: {
        enabled: false
      },
      metrics: {
        enabled: false
      }
    }
  })

  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query)
    const actualErrors = getErrorsFromResponse(response, browser)
    const expectedErrorMessages = [
      { message: 'original onerror', tested: false }, 
      { message: 'uncaught error', tested: false }, 
      { message: 'fake', tested: false }, 
      { message: 'original return false', tested: false }
    ]
    actualErrors.forEach(err => {
      const targetError = expectedErrorMessages.find(x => x.message === err.params.message)
      if (targetError) targetError.tested = true
      t.ok(!!targetError, `expected ${err.params.message} message exists`)
      t.ok(!!err.params.stack_trace, `stack_trace exists`)
      t.ok(!!err.params.stackHash, `stackHash exists`)
      // fake has different exceptionClass than the others.... so check
      if (err.params.message === 'fake') t.ok(err.params.exceptionClass !== 'Error', `fake error has correct exceptionClass (${err.params.exceptionClass})`)
      else t.ok(err.params.exceptionClass === 'Error', `error has correct exceptionClass (${err.params.exceptionClass})`)
    })
    t.ok(expectedErrorMessages.every(x => x.tested), 'All expected error messages were found')
    t.end()
  }).catch(fail)

  function fail(err) {
    t.error(err)
    t.end()
  }
})

function expectedErrorsForBrowser(router, browser) {
  let uncaught1URL = router.assetURL('js/uncaught1.js').split('?')[0]
  let uncaught2URL = router.assetURL('js/uncaught2.js').split('?')[0]

  let expected = [
    {
      message: 'uncaught error',
      stack: [{ u: uncaught1URL, l: 12 }]
    },
    {
      message: 'fake',
      stack: [{ f: 'evaluated code' }]
    },
    {
      message: 'original onerror',
      stack: [
        { f: 'originalOnerrorHandler', u: '<inline>', l: 17 },
        { f: 'window.onerror', u: '<inline>', l: 28 }
      ]
    },
    {
      message: 'original onerror',
      stack: [
        { f: 'originalOnerrorHandler', u: '<inline>', l: 17 },
        { f: 'window.onerror', u: '<inline>', l: 28 }
      ]
    },
    {
      message: 'original return abc',
      stack: [{ u: uncaught2URL, l: 17 }]
    }
  ]


  if (browser.match('ie@<10')) {
    expected[2].stack = [{}]
  }
  if (browser.match('safari@<7')) {
    expected[2].stack = [{ u: '<inline>', l: 19 }]
  }

  if (browser.hasFeature('uncaughtErrorObject')) {
    expected[0].stack[0].f = 'uncaughtError'
    expected[0].stack[1] = { u: uncaught1URL, l: 12 }
    expected[3].stack[0].f = 'onerrorReturn'
    expected[3].stack[1] = { u: uncaught2URL, l: 17 }
    if (browser.match('ie@11')) {
      expected[0].stack[1].f = 'code'
      expected[3].stack[1].f = 'code'
    }
  }

  return expected
}
