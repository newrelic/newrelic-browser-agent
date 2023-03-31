/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { workerTypes, typeToMatcher } = require('./helpers')

const init = {
  jserrors: {
    enabled: false,
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

var timedPromiseAll = (promises, ms) => Promise.race([
  new Promise((resolve, reject) => {
    setTimeout(() => resolve(), ms)
  }),
  Promise.all(promises)
])

workerTypes.forEach(type => {
  disabledJsErrorsTest(type, typeToMatcher(type))
})

function disabledJsErrorsTest (type, matcher) {
  testDriver.test(`${type} - disabled jserrors should not generate errors`, matcher, function (t, browser, router) {
    let assetURL = router.assetURL(`worker/${type}-worker.html`, {
      init,
      workerCommands: [
        () => newrelic.noticeError(new Error('test'))
      ].map(x => x.toString())
    })

    let loadPromise = browser.get(assetURL)
    let errPromise = router.expectErrors()

    timedPromiseAll([errPromise, loadPromise, router.expectRum()], 6000).then((response) => {
      if (response) {
        // will be null if timed out, so a payload here means it sent and error
        t.fail('Should not have generated "error" payload')
      } else {
        // errors harvest every 5 seconds, if 6 seconds pass and Promise is not resolved, that means it was never generated
        t.pass('Did not generate "error" payload')
      }
      t.end()
    }).catch(fail)

    function fail (err) {
      t.error(err)
      t.end()
    }
  })
}
