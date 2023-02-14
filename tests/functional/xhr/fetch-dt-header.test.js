/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const { fail, testCases, validateNewrelicHeader, validateNoNewrelicHeader, validateTraceContextHeaders, validateNoTraceContextHeaders } = require('./helpers')

let fetchBrowsers = testDriver.Matcher.withFeature('fetch')

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
  testDriver.test(testCase.name, fetchBrowsers, (t, browser, router) => {
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
        init.distributed_tracing.allowed_origins.push('http://' + router.testServer.bamServer.host + ':' + router.testServer.bamServer.port)
      }
    }

    scenarios.forEach((scenario) => {
      t.test(scenario.name, (nestedTest) => {
        let htmlFile
        if (testCase.sameOrigin) {
          htmlFile = scenario.sameOriginFile
        } else {
          htmlFile = scenario.crossOriginFile
        }

        const ajaxPromiseServer = testCase.sameOrigin
          ? 'assetServer'
          : 'bamServer'
        const ajaxPromise = router.expect(ajaxPromiseServer, {
          test: function (request) {
            const url = new URL(request.url, 'resolve://')
            return url.pathname === `/dt/${router.testId}`
          }
        })
        let loadPromise = browser.get(router.assetURL(htmlFile, { testId: router.testId, injectUpdatedLoaderConfig: true, config, init }))

        Promise.all([ajaxPromise, loadPromise])
          .then(([{ request }]) => {
            if (testCase.newrelicHeader) {
              validateNewrelicHeader(nestedTest, request.headers, config)
            } else {
              validateNoNewrelicHeader(nestedTest, request.headers)
            }

            if (testCase.traceContextHeaders) {
              validateTraceContextHeaders(nestedTest, request.headers, config)
            } else {
              validateNoTraceContextHeaders(nestedTest, request.headers)
            }
            nestedTest.end()
          })
          .catch(fail(nestedTest))
      })
    })
  })
})
