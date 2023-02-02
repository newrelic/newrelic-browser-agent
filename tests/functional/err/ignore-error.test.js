/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require("../../../tools/jil/index");
const {
  assertErrorAttributes,
  assertExpectedErrors,
  getErrorsFromResponse,
} = require("./assertion-helpers");

let supported = testDriver.Matcher.withFeature("reliableUnloadEvent");

testDriver.test(
  "ignoring errors works",
  supported,
  function (t, browser, router) {
    let assetURL = router.assetURL("ignored-error.html", {
      init: {
        page_view_timing: {
          enabled: false,
        },
        metrics: {
          enabled: false,
        },
      },
    });

    let rumPromise = router.expectRumAndCondition("window.errorsThrown");
    let errorsPromise = router.expectErrors();
    let loadPromise = browser.get(assetURL);

    Promise.all([errorsPromise, rumPromise, loadPromise])
      .then(([response]) => {
        assertErrorAttributes(t, response.query, "has errors");

        const actualErrors = getErrorsFromResponse(response, browser);

        let expectedErrors = [
          {
            name: "Error",
            message: "report",
            stack: [
              {
                u: "<inline>",
                l: 23,
              },
            ],
          },
        ];

        assertExpectedErrors(
          t,
          browser,
          actualErrors,
          expectedErrors,
          assetURL
        );
        t.end();
      })
      .catch(fail);

    function fail(err) {
      t.error(err);
      t.end();
    }
  }
);
