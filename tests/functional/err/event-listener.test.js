/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const {assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse} = require('./assertion-helpers')

let reliableUnloadEvent = testDriver.Matcher.withFeature('reliableUnloadEvent')

// test requires Object.defineProperty
let supported = reliableUnloadEvent
  .exclude('ie@<9')
  .exclude('firefox@<4')

testDriver.test('reporting errors from event listener callbacks', supported, function (t, browser, router) {
  let assetURL = router.assetURL('event-listener-error.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  })

  let rumPromise = router.expectRumAndErrors()
  let loadPromise = browser.get(assetURL)

  Promise.all([rumPromise, loadPromise]).then(([response]) => {
    assertErrorAttributes(t, response.query)
    const actualErrors = getErrorsFromResponse(response, browser)
    let eventListenersURL = router.assetURL('js/event-listener-error.js').split('?')[0]
    let expectedErrors = [
      {
        message: 'document addEventListener listener',
        stack: [
          {f: 'handleEvent', u: eventListenersURL, l: 15},
          {f: 't', u: '<inline>', l: 11}
        ]
      },
      {
        message: 'global addEventListener listener',
        stack: [
          {f: 'handleEvent', u: eventListenersURL, l: 8},
          {f: 't', u: '<inline>', l: 11}
        ]
      }
    ]

    // No function name from earlier IEs
    if (browser.match('ie@<10, safari@<7')) {
      delete expectedErrors[0].stack[0].f
      delete expectedErrors[1].stack[0].f
      expectedErrors[0].stack.splice(1, 1)
      expectedErrors[1].stack.splice(1, 1)
    }

    assertExpectedErrors(t, browser, actualErrors, expectedErrors, assetURL)
    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
