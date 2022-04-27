/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

var es6 = testDriver.Matcher.withFeature('firstPaint')

testDriver.test('Loads JS core file', es6, function (t, browser, router) {
  t.plan(1)

  let loadPromise = browser.safeGet(router.assetURL('modular/js-errors.html'))
  let errorsPromise = router.expectErrors()

  Promise.all([loadPromise, errorsPromise])
    .then(([loadResult, errorsResult]) => {
      console.log('loadResult', loadResult)
      console.log('errorsResult', errorsResult)

      t.ok()
    })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
