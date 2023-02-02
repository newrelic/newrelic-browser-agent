/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require("../../../tools/jil/index");
const { fail } = require("./helpers");

testDriver.test(
  "does not set CAT headers on outbound XHRs to different origin",
  function (t, browser, router) {
    t.plan(1);

    let loadPromise = browser.get(
      router.assetURL("cat-cors.html", { testId: router.testID })
    );
    let meowPromise = router.expectCustomGet("/cat-cors/{key}", (req, res) => {
      res.end("ok");
    });

    Promise.all([meowPromise, loadPromise])
      .then(([req]) => {
        t.notok(
          req.headers["x-newrelic-id"],
          "cross-origin XHR should not have CAT header"
        );
      })
      .catch(fail(t, "unexpected error"));
  }
);
