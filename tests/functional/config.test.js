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

  let expectedUrl = 'js-agent.newrelic.com/nr.min.js'
  if (process.env.VERSION) {
    expectedUrl = `js-agent.newrelic.com/nr-${process.env.VERSION}.min.js`
  }
  if (process.env.VERSION && process.env.PATH) {
    expectedUrl = `js-agent.newrelic.com/${process.env.PATH}/nr-${process.env.VERSION}.min.js`
  }

  browser
    .get(router.assetURL('instrumented.html', {config}))
    .safeEval('NREUM.info.agent', function (err, agentUrl) {
      console.log(agentUrl)
      if (err) t.fail(err)
      if (process.env.VERSION) {
        t.equal(agentUrl, expectedUrl, 'agent url should have default value with the correct version')
      } else {
        t.equal(agentUrl, expectedUrl, 'agent url should have the default value')
      }
    })
    .catch(fail)

  function fail (err) {
    t.fail(err)
    t.end()
  }
})
