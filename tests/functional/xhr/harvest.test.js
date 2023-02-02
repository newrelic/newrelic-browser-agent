/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require("../../../tools/jil/index");
const { fail, querypack } = require("./helpers");

testDriver.test(
  "ajax events harvests are retried when collector returns 429",
  function (t, browser, router) {
    let assetURL = router.assetURL("xhr-outside-interaction.html", {
      loader: "full",
      init: {
        page_view_timing: {
          enabled: false,
        },
        harvest: {
          tooManyRequestsDelay: 10,
        },
        spa: {
          enabled: false,
        },
        ajax: {
          harvestTimeSeconds: 2,
          enabled: true,
        },
        metrics: {
          enabled: false,
        },
      },
    });

    router.scheduleResponse("events", 429);

    let ajaxPromise = router.expectAjaxEvents();
    let rumPromise = router.expectRum();
    let loadPromise = browser.safeGet(assetURL);

    let firstBody;

    Promise.all([ajaxPromise, loadPromise, rumPromise])
      .then(([result]) => {
        t.equal(result.res.statusCode, 429, "server responded with 429");
        firstBody = querypack.decode(result.body);
        return router.expectAjaxEvents();
      })
      .then((result) => {
        const secondBody = querypack.decode(result.body);

        const secondContainsFirst = firstBody.every((firstElement) => {
          return secondBody.find((secondElement) => {
            return (
              secondElement.path === firstElement.path &&
              secondElement.start === firstElement.start
            );
          });
        });

        t.equal(result.res.statusCode, 200, "server responded with 200");
        t.ok(
          secondContainsFirst,
          "second body should include the contents of the first retried harvest"
        );
        t.equal(
          router.seenRequests.events,
          2,
          "got two events harvest requests"
        );

        t.end();
      })
      .catch(fail(t));
  }
);

// NOTE: we do not test 408 response in a functional test because some browsers automatically retry
// 408 responses, which makes it difficult to distinguish browser retries from the agent retries
