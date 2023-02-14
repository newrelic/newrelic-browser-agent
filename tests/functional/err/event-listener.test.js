/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { assertErrorAttributes, assertExpectedErrors, getErrorsFromResponse } = require('./assertion-helpers')

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
      },
      metrics: {
        enabled: false
      }
    }
  })

  let rumPromise = router.expectRum()
  let errorsPromise = router.expectErrors()
  let loadPromise = browser.get(assetURL)

  Promise.all([errorsPromise, rumPromise, loadPromise]).then(([{ request }]) => {
    assertErrorAttributes(t, request.query)
    const actualErrors = getErrorsFromResponse(request, browser)
    let eventListenersURL = router.assetURL('js/event-listener-error.js').split('?')[0]
    let expectedErrors = [
      {
        message: 'document addEventListener listener',
        stack: [
          { f: 'Object.handleEvent', u: eventListenersURL, l: 15 },
          { f: 'HTMLDocument.object', u: '<inline>', l: 13 }
        ]
      },
      {
        message: 'global addEventListener listener',
        stack: [
          { f: 'Object.handleEvent', u: eventListenersURL, l: 8 },
          { f: 'object', u: '<inline>', l: 13 }
        ]
      }
    ]
    t.equal(actualErrors.length, 2, 'Has 2 errors')
    actualErrors.forEach((err, i) => {
      t.equal(err.params.exceptionClass, 'Error', err.params.message + 'exceptionClass is Error')
      t.equal(err.params.message, expectedErrors[i].message, err.params.message + 'message is correct')
      t.ok(err.params.stack_trace.includes('handleEvent'), 'Stack trace has handleEvent')
      t.ok(err.params.stack_trace.includes(eventListenersURL), 'Stack trace has eventListenerUrl')
    })

    t.end()
  }).catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})
