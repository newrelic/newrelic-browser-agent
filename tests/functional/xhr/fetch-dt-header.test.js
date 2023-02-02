/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require("../../../tools/jil/index");
const {
  fail,
  testCases,
  validateNewrelicHeader,
  validateNoNewrelicHeader,
  validateTraceContextHeaders,
  validateNoTraceContextHeaders,
} = require("./helpers");

let fetchBrowsers = testDriver.Matcher.withFeature("fetch");

// each scenario will be run for each test case, scenario corresponds to a specific
// HTML file that uses the fetch API in a specific way
const scenarios = [
  {
    name: "when fetch is called with one string argument",
    sameOriginFile: "spa/dt/fetch-dt-sameorigin-load.html",
    crossOriginFile: "spa/dt/fetch-dt-crossorigin-load.html",
  },
  {
    name: "when fetch is called with URL string and options arguments",
    sameOriginFile: "spa/dt/fetch-dt-sameorigin-load-2.html",
    crossOriginFile: "spa/dt/fetch-dt-crossorigin-load-2.html",
  },
  {
    name: "when fetch is called with a Request argument",
    sameOriginFile: "spa/dt/fetch-dt-sameorigin-load-3.html",
    crossOriginFile: "spa/dt/fetch-dt-crossorigin-load-3.html",
  },
  {
    name: "when fetch is called with a URL object argument",
    sameOriginFile: "spa/dt/fetch-dt-sameorigin-load-4.html",
    crossOriginFile: "spa/dt/fetch-dt-crossorigin-load-4.html",
  },
];

testCases.forEach((testCase) => {
  testDriver.test(testCase.name, fetchBrowsers, (t, browser, router) => {
    let config = {
      accountID: "1234",
      agentID: "2468",
      trustKey: "1",
    };

    // create init configuration from test case
    let init = null;
    if (testCase.configuration) {
      init = {
        distributed_tracing: testCase.configuration,
      };
      if (testCase.addRouterToAllowedOrigins) {
        init.distributed_tracing.allowed_origins.push(router.beaconURL());
      }
    }

    // when testing same origin, serve the HTML file from the same URL (port) as
    // the router, so that the XHR call can be inspected (while being on same origin)
    const useRouterUrl = testCase.sameOrigin;

    scenarios.forEach((scenario) => {
      t.test(scenario.name, (t) => {
        let htmlFile;
        if (testCase.sameOrigin) {
          htmlFile = scenario.sameOriginFile;
        } else {
          htmlFile = scenario.crossOriginFile;
        }

        let loadPromise = browser.get(
          router.assetURL(
            htmlFile,
            {
              testId: router.testID,
              injectUpdatedLoaderConfig: true,
              config,
              init,
            },
            useRouterUrl
          )
        );
        let fetchPromise = router.expectCustomGet("/dt/{key}", (req, res) => {
          res.end("ok");
        });

        Promise.all([fetchPromise, loadPromise])
          .then(([{ headers }]) => {
            if (testCase.newrelicHeader) {
              validateNewrelicHeader(t, headers, config);
            } else {
              validateNoNewrelicHeader(t, headers);
            }

            if (testCase.traceContextHeaders) {
              validateTraceContextHeaders(t, headers, config);
            } else {
              validateNoTraceContextHeaders(t, headers);
            }
            t.end();
          })
          .catch(fail(t));
      });
    });
  });
});
