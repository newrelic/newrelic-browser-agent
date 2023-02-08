/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index');

testDriver.test('RUM ', function (t, browser, router) {
  t.plan(1);

  setTimeout(() => {
    t.ok(1 === 1, 'The agent was unconfigured, so no rum event fired!');
    t.end();
  }, 5000);

  let rumPromise = router.expectRum();
  let loadPromise = browser.get(router.assetURL('unconfigured-on-load.html'));

  Promise.all([rumPromise, loadPromise]).then(() => fail('should not have recieved rum call!'));

  function fail(e) {
    t.error(e);
    t.end();
  }
});
