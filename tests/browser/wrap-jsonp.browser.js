/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");

const { setup } = require("./utils/setup");
const { wrapJsonP } = require("../../src/common/wrap/wrap-jsonp");
const { baseEE } = setup();

function removeListener(type, fn) {
  const handlers = this.listeners(type);
  var index = handlers.indexOf(fn);
  handlers.splice(index, 1);
}

var validUrls = ["/jsonp?cb=foo", "/jsonp?cb=foo#abc", "/jsonp?callback=foo", "/jsonp?callback=foo#abc"];

var invalidUrls = ["/jsonp?mycb=foo", "/jsonp?ab=1&mycb=foo", "/jsonp?mycallback=foo", "/jsonp?ab=1&mycallback=foo"];

validUrls.forEach((url) => {
  shouldWork(url);
});

invalidUrls.forEach((url) => {
  shouldNotWork(url);
});

function shouldWork(url) {
  jil.browserTest("jsonp works with " + url, function (t) {
    t.plan(1);

    const jsonpEE = wrapJsonP(baseEE);

    jsonpEE.removeListener = removeListener;

    var listener = function () {
      t.comment("listener called");
      jsonpEE.removeListener("new-jsonp", listener);
      t.ok(true, "should get here");
      t.end();
    };
    jsonpEE.on("new-jsonp", listener);

    var document = window.document;
    window.foo = function () {};
    var el = document.createElement("script");
    el.src = url;
    window.document.body.appendChild(el);
  });
}

function shouldNotWork(url) {
  jil.browserTest("jsonp does not work with " + url, function (t) {
    t.plan(1);

    const jsonpEE = wrapJsonP(baseEE);

    jsonpEE.removeListener = removeListener;

    var listener = function () {
      t.fail("should not have been called");
      t.end();
    };

    jsonpEE.on("new-jsonp", listener);

    var document = window.document;
    window.foo = function () {};
    var el = document.createElement("script");
    el.src = url;
    window.document.body.appendChild(el);

    jsonpEE.removeListener("new-jsonp", listener);
    t.ok(true);
    t.end();
  });
}
