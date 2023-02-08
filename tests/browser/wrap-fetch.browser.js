/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil');

jil.browserTest('response size', function (t) {
  const { setup } = require('./utils/setup');
  const { wrapFetch } = require('../../src/common/wrap/wrap-fetch');

  const { baseEE } = setup();
  const fetchEE = wrapFetch(baseEE);

  t.test('is captured when content-length is present', function (t) {
    t.plan(2);
    fetchEE.on('fetch-done', checkSize);

    window
      .fetch('/text?length=1234')
      .then(function (res) {
        t.pass('fetch got response');
        tearDown();
      })
      .catch((err) => {
        t.error(err);
        tearDown();
      });

    function tearDown() {
      fetchEE.removeEventListener('fetch-done', checkSize);
    }

    function checkSize() {
      t.equal(this.rxSize, '1234');
    }
  });

  t.test('is not captured when content-length is not present', function (t) {
    t.plan(2);
    fetchEE.on('fetch-done', checkSize);

    window
      .fetch('/chunked')
      .then(function (res) {
        t.pass('fetch got response');
        tearDown();
      })
      .catch((err) => {
        t.error(err);
        tearDown();
      });

    function tearDown() {
      fetchEE.removeEventListener('fetch-done', checkSize);
    }

    function checkSize() {
      t.ok(typeof this.rxSize === 'undefined', 'size should not be present');
    }
  });
});

jil.browserTest('Safari 11 fetch clone regression', function (t) {
  const { setup } = require('./utils/setup');
  const { wrapFetch } = require('../../src/common/wrap/wrap-fetch');

  const { baseEE } = setup();
  const fetchEE = wrapFetch(baseEE);

  var responseSizes = [1, 10, 100, 1000, 10000, 100000];
  responseSizes.forEach(function (size) {
    t.test('agent should not cause clone to fail, response size: ' + size, function (t) {
      window
        .fetch('/text?length=' + size)
        .then(function (res) {
          res.clone();
          t.pass('clone was successful');
          t.end();
        })
        .catch((err) => {
          t.error(err);
          t.end();
        });
    });
  });
});
