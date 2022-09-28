/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var tape = require('tape')
var browsers = require('../../util/browsers-supported.json')
var browserList = require('../../util/browser-list')
var BrowserSpec = require('../../util/browser-list').BrowserSpec
const latestVersStringRe = require('../../util/browser-list').latestVersStringRe;

tape("Regex for latest versions works", function(t) {
  t.ok(latestVersStringRe.test("latest"), "latest -- should pass");
  t.notOk(latestVersStringRe.test("latest-0"), "latest-0 -- should not pass");
  t.ok(latestVersStringRe.test("latest-1"), "latest-1 -- should pass");
  t.ok(latestVersStringRe.test("latest-9"), "latest-9 -- should pass");
  t.notOk(latestVersStringRe.test("latest-10"), "latest-10 -- should not pass");
  t.notOk(latestVersStringRe.test("latest-"), "latest- -- should not pass");
  t.notOk(latestVersStringRe.test("latest-X"), "latest-X -- should not pass");
  t.end();
})

tape('returns BrowserSpec instances', function (t) {
  var browserSpecs = browserList('*@*')
  t.ok(browserSpecs.length > 0)
  t.ok(browserSpecs[0] instanceof BrowserSpec)
  t.end()
})

tape('returns only browsers defined in config file', (t) => { // "config file" == browsers.json
  var browserSpecs = browserList('chrome@latest')
  t.ok(browserSpecs.length === 1, 'got defined browser')

  browserSpecs = browserList('chrome@55')
  t.ok(browserSpecs.length === 0, 'got no browser')

  t.end()
})

tape('`*` returns all non-beta versions', (t) => {
  // note that beta browsers are excluded, since they are allowed to fail
  // unreleased should be tested separately
  t.ok(browsers.chrome.find(b => b.version === 'beta') != null, 'chrome beta is defined')
  var browserSpecs = browserList('chrome@*')
  t.ok(browserSpecs.length === browsers.chrome.length - 1, 'got all browsers')
  t.end()
})

tape('no range returns all versions', (t) => {
  var browserSpecs = browserList('chrome')
  t.ok(browserSpecs.length === browsers.chrome.length, 'got all browsers')
  t.end()
})

tape('multiple browsers', (t) => {
  var browserSpecs = browserList('chrome@*,firefox@*')
  var expected = browsers.chrome.length + browsers.firefox.length
  expected -= browsers.chrome.filter(b => b.version === 'beta')
  expected -= browsers.firefox.filter(b => b.version === 'beta')
  t.ok(browserSpecs.length, expected, 'got both browsers')
  t.end()
})

tape('beta returns labeled `beta` if defined', function (t) {
  var browserSpecs = browserList('chrome@beta')
  t.equal(browserSpecs.length, 1, 'got one')
  t.equal(browserSpecs[0].version, 'beta', 'got the right one')
  t.end()
})

tape('*@beta returns all browser versions labeled `beta`', function (t) {
  var browserSpecs = browserList('*@beta')
  t.equal(browserSpecs.length, 1)
  browserSpecs.forEach(b => {
    t.equal(b.version, 'beta', 'got the right one')
  })
  t.end()
})

/**
 * Note: Part of test is a bit redundant after the 'returns only browsers defined in config file' test above.
 */
tape('latest returns labeled `latest` and -1 if defined', function (t) {
  var browserSpecs = browserList('chrome@latest')
  t.equal(browserSpecs.length, 1, 'got one')
  t.equal(browserSpecs[0].version, 'latest', 'got the right one (latest)')

  browserSpecs = browserList('chrome@latest-1')
  t.equal(browserSpecs.length, 1, 'got one')
  t.equal(browserSpecs[0].version, 'latest-1', 'got the right one (latest-1)')
  t.end()
})

tape('latest returns biggest version if `latest` and previous -X labels not defined', function (t) {
  var browserSpecs = browserList('ie@latest')
  t.equal(browserSpecs.length, 1, 'got one')
  t.equal(browserSpecs[0].version, '11', 'got the right one (ie-11)')

  browserSpecs = browserList('chrome@latest-9')
  t.equal(browserSpecs.length, 1, 'got one')
  t.equal(browserSpecs[0].version, 'beta', 'got the right one (chrome-beta)')
  t.end()
})
