/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('jil')

let matcher = testDriver.Matcher.withFeature('frameworks')

const init = {
  jserrors: {
    harvestTimeSeconds: 5
  },
  metrics: {
    enabled: false
  }
}

testDriver.test('Loading RequireJS does not cause errors.', matcher, function (t, browser, router) {
  t.plan(1)

  let rumPromise = router.expectRum()
  let assetUrl = router.assetURL('requirejs-compatibility.html', {
    init: {
      page_view_timing: {
        enabled: false
      }
    }
  })
  let loadPromise = browser.get(assetUrl)

  Promise.all([rumPromise, loadPromise]).then(([response]) => {
    t.pass()
    t.end()
  }).catch((err) => {
    t.error(err)
    t.end()
  })
})
