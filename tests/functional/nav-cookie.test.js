/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../tools/jil/index');

testDriver.test('agent set nav cookie when page is unloading', function (t, browser, router) {
  let url = router.assetURL('final-harvest.html', {
    init: {
      page_view_timing: {
        enabled: false,
      },
    },
  });

  let loadPromise = browser.safeGet(url).catch(fail);
  let rumPromise = router.expectRum();

  Promise.all([rumPromise, loadPromise])
    .then(() => {
      t.equal(router.seenRequests.ins, 0, 'no ins harvest yet');

      let insPromise = router.expectIns();

      let loadPromise = browser.safeEval('newrelic.addPageAction("hello", { a: 1 })').get(router.assetURL('/'));

      return Promise.all([insPromise, loadPromise]).then(([ins, load]) => {
        return ins;
      });
    })
    .then(() => {
      t.equal(router.seenRequests.ins, 1, 'received one ins harvest');
      t.end();
    })
    .catch(fail);

  function fail(err) {
    t.error(err);
    t.end();
  }
});
