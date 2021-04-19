/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import testDriver from '../../../tools/jil/index.es6'

let fetchBrowsers = testDriver.Matcher.withFeature('fetch')
                                      .exclude('opera@<=12') // Sauce Labs Opera doesn't trust our cert
                                      .exclude('ie@<10') // IE 9 and below do not support btoa()
let corsBrowsers = testDriver.Matcher.withFeature('cors')
let supported = fetchBrowsers.intersect(corsBrowsers)

// test cases representing different configurations for same or cross origin calls
// `newrelicHeader` and `traceContextHeaders` specify whether headers should be present
const testCases = [
  {
    name: 'no headers added when feature is not enabled',
    configuration: null,
    sameOrigin: true,
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'headers are added on same origin by default',
    configuration: {
      enabled: true
    },
    sameOrigin: true,
    newrelicHeader: true,
    traceContextHeaders: true
  },
  {
    name: 'newrelic header is not added on same origin when specifically disabled in configuration',
    configuration: {
      enabled: true,
      exclude_newrelic_header: true
    },
    sameOrigin: true,
    newrelicHeader: false,
    traceContextHeaders: true
  },
  {
    name: 'no headers are added on different origin by default',
    configuration: null,
    sameOrigin: false,
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'no headers are added on different origin when the origin is not allowed',
    configuration: {
      enabled: true,
      allowed_origins: ['https://newrelic.com']
    },
    newrelicHeader: false,
    traceContextHeaders: false
  },
  {
    name: 'default headers on different origin when the origin is allowed',
    configuration: {
      enabled: true,
      allowed_origins: []
    },
    addRouterToAllowedOrigins: true,
    newrelicHeader: true,
    traceContextHeaders: false
  },
  {
    name: 'trace context headers are added on different origin when explicitly enabled in configuration',
    configuration: {
      enabled: true,
      allowed_origins: [],
      cors_use_tracecontext_headers: true
    },
    addRouterToAllowedOrigins: true,
    newrelicHeader: true,
    traceContextHeaders: true
  },
  {
    name: 'newrelic header is not added on different origin when explicitly disabled in configuration',
    configuration: {
      enabled: true,
      allowed_origins: [],
      cors_use_newrelic_header: false
    },
    addRouterToAllowedOrigins: true,
    newrelicHeader: false,
    traceContextHeaders: false
  }
]

// each scenario will be run for each test case, scenario corresponds to a specific
// HTML file that uses the fetch API in a specific way
const scenarios = [
  {
    name: 'when fetch is called with one string argument',
    sameOriginFile: 'spa/dt/fetch-dt-sameorigin-load.html',
    crossOriginFile: 'spa/dt/fetch-dt-crossorigin-load.html'
  },
  {
    name: 'when fetch is called with URL string and options arguments',
    sameOriginFile: 'spa/dt/fetch-dt-sameorigin-load-2.html',
    crossOriginFile: 'spa/dt/fetch-dt-crossorigin-load-2.html'
  },
  {
    name: 'when fetch is called with a Request argument',
    sameOriginFile: 'spa/dt/fetch-dt-sameorigin-load-3.html',
    crossOriginFile: 'spa/dt/fetch-dt-crossorigin-load-3.html'
  },
  {
    name: 'when fetch is called with a URL object argument',
    sameOriginFile: 'spa/dt/fetch-dt-sameorigin-load-4.html',
    crossOriginFile: 'spa/dt/fetch-dt-crossorigin-load-4.html'
  }
]

testCases.forEach((testCase) => {
  testDriver.test(testCase.name, supported, (t, browser, router) => {
    let config = {
      accountID: '1234',
      agentID: '2468',
      trustKey: '1'
    }

    // create init configuration from test case
    let init = null
    if (testCase.configuration) {
      init = {
        distributed_tracing: testCase.configuration
      }
      if (testCase.addRouterToAllowedOrigins) {
        init.distributed_tracing.allowed_origins.push(router.beaconURL())
      }
    }

    // when testing same origin, serve the HTML file from the same URL (port) as
    // the router, so that the XHR call can be inspected (while being on same origin)
    const useRouterUrl = testCase.sameOrigin

    scenarios.forEach((scenario) => {
      t.test(scenario.name, (t) => {
        let htmlFile
        if (testCase.sameOrigin) {
          htmlFile = scenario.sameOriginFile
        } else {
          htmlFile = scenario.crossOriginFile
        }

        let loadPromise = browser.get(router.assetURL(htmlFile, { testId: router.testID, injectUpdatedLoaderConfig: true, config, init }, useRouterUrl))
        let fetchPromise = router.expectCustomGet('/dt/{key}', (req, res) => { res.end('ok') })

        Promise.all([fetchPromise, loadPromise])
          .then(([{headers}]) => {
            if (testCase.newrelicHeader) {
              validateNewrelicHeader(t, headers, config)
            } else {
              validateNoNewrelicHeader(t, headers)
            }

            if (testCase.traceContextHeaders) {
              validateTraceContextHeaders(t, headers, config)
            } else {
              validateNoTraceContextHeaders(t, headers)
            }
            t.end()
          })
          .catch(fail)

        function fail (err) {
          t.error(err)
          t.end()
        }
      })
    })
  })
})

function validateNewrelicHeader(t, headers, config) {
  t.ok(headers['newrelic'], 'newrelic header should be present')

  let buffer = new Buffer(headers['newrelic'], 'base64')
  let text = buffer.toString('ascii')
  let dtPayload = JSON.parse(text)

  t.deepEqual(dtPayload.v, [0, 1])
  t.equal(dtPayload.d.ty, 'Browser')
  t.equal(dtPayload.d.ac, config.accountID)
  t.equal(dtPayload.d.ap, config.agentID)
  t.equal(dtPayload.d.tk, config.trustKey)
  t.ok(dtPayload.d.id)
  t.ok(dtPayload.d.tr)
  t.ok(dtPayload.d.ti)
}

function validateNoNewrelicHeader(t, headers) {
  t.notOk(headers['newrelic'], 'newrelic header should not be present')
}

function validateTraceContextHeaders(t, headers, config) {
  t.ok(headers['traceparent'], 'traceparent header should be present')
  t.ok(headers['tracestate'], 'tracestate header should be present')

  const parentHeader = headers['traceparent']
  var parts = parentHeader.split('-')
  t.equal(parts.length, 4, 'parent header should have four parts')
  t.equal(parts[0], '00', 'first part should be format version set to 00')
  t.ok(parts[1], 'trace ID is there')
  t.ok(parts[2], 'span ID is there')
  t.equal(parts[3], '01', 'fourth part should be set to sampled flag')

  const stateHeader = headers['tracestate']
  var key = stateHeader.substring(0, stateHeader.indexOf('='))
  t.equal(key, config.trustKey + '@nr', 'key should be in the right format')

  parts = stateHeader.substring(stateHeader.indexOf('=') + 1).split('-')
  t.equal(parts.length, 9, 'state header should have nine parts')
  t.equal(parts[0], '0', 'version is set to 0')
  t.equal(parts[1], '1', 'parent type is set to 1 for Browser')
  t.equal(parts[2], config.accountID, 'third part is set to account ID')
  t.equal(parts[3], config.agentID, 'fourth part is set to app/agent ID')
  t.ok(parts[4], 'span ID is there')
  t.equal(parts[5], '', 'fifth part is empty - no transaction in Browser')
  t.equal(parts[6], '', 'fifth part is set to empty to defer sampling decision to next hop')
  t.equal(parts[7], '', 'priority is not set')
  t.ok(parts[8], 'timestamp is there')
}

function validateNoTraceContextHeaders(t, headers) {
  t.notOk(headers['traceparent'], 'traceparent header should not be present')
  t.notOk(headers['tracestate'], 'tracestate header should not be present')
}
