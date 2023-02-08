/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const tapParser = require('tap-parser');
const asserters = require('wd').asserters;

function loadBrowser(testDriver, file, name, spec) {
  let path = niceFileName(file);
  testDriver.test(name || path, spec || null, (t, browser, router) => {
    browser
      .safeGet(router.urlForBrowserTest(file))
      .waitFor(asserters.jsCondition('window._jilUnitDone', true), testDriver.timeout)
      .safeEval('$("#tap").text()')
      .then((text) => {
        parse(t, text, path, browser.stream);
      })
      .catch(fail);

    function fail(err) {
      t.error(err);
      t.end();
    }
  });
}

function niceFileName(path) {
  return path.replace(/^.*\/tests\//, '');
}

function parse(t, tap, path, stream) {
  if (!tap) {
    t.fail(new Error('did not receive tap output'));
    t.end();
    return;
  }

  let parser = tapParser();
  let sawTests = false;
  let sawPlan = false;

  parser.once('assert', function (assert) {
    sawTests = true;
  });

  parser.once('plan', function () {
    sawPlan = true;
  });

  parser.on('assert', function (assert) {
    t.ok(assert.ok, assert.name);
  });

  parser.on('comment', function (comment) {
    t.comment(comment);
  });

  parser.on('complete', (results) => {
    if (!sawPlan) {
      t.fail(`did not see plan before first assertion for ${path}`);
    } else if (!sawTests) {
      t.fail(`did not see any assertions for ${path}`);
    } else if (!results.ok) {
      t.fail(new Error(`unit tests failed for ${path}`));
    } else {
      t.pass(`unit tests passed for ${path}`);
    }

    t.end();
  });

  parser.end(tap);
}

module.exports = loadBrowser;
