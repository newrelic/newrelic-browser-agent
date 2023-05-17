/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { getErrorsFromResponse } = require('../err/assertion-helpers')
const { workerTypes, typeToMatcher, workerCustomAttrs } = require('./helpers')

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

workerTypes.forEach(type => {
  setCustomAttributeTest(type, typeToMatcher(type))
})

function setCustomAttributeTest (type, matcher) {
  testDriver.test(`${type} - an error has a custom attribute if setCustomAttribute() is called`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => { newrelic.setCustomAttribute('hi', 'mom') },
        () => { throw new Error('test') }
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    Promise.all([errPromise, loadPromise, router.expectRum()]).then(([{ request }]) => {
      const actualErrors = getErrorsFromResponse(request, browser)

      t.equal(actualErrors.length, 1, 'exactly one error')

      let actualError = actualErrors[0]
      t.equal(actualError.params.message, 'test', 'has the expected message')
      t.deepEqual(actualError.custom, { ...workerCustomAttrs, hi: 'mom' }, 'Should have correct custom attributes')
      t.end()
    }).catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}
