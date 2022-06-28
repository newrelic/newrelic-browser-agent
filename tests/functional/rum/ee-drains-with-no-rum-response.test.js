/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')

const asserters = testDriver.asserters

testDriver.test('RUM ', function (t, browser, router) {
  t.plan(1)

  let url = router.assetURL('ee-drains-with-no-rum-response.html')

  browser.get(url)
    .waitFor(asserters.jsCondition('!window.hasRum'))
    .safeEval('NREUM.ee.get(Object.keys(NREUM.initializedAgents)[0]).backlog', function (err, backlog) {
      if (err) throw (err)
      t.notOk(backlog.api, 'ee buffer should be empty')
    })
    .catch(fail)

  router.expectCustomGet('/1/{key}', (req, res) => { res.end('window.hasRum = true') })
    .catch(fail)

  function fail (e) {
    t.error(e)
    t.end()
  }
})
