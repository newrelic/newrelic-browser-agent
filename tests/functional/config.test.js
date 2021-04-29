/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index')

testDriver.test('empty string for agent key', function (t, browser, router) {
  t.plan(1)

  let config = {
    agent: ''
  }

  browser
    .get(router.assetURL('instrumented.html', {config}))
    .safeEval('NREUM.info.agent', function (err, agentUrl) {
      if (err) t.fail(err)
      t.equal(agentUrl, 'js-agent.newrelic.com/nr.min.js', 'agent url should use default value')
    })
    .catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})
