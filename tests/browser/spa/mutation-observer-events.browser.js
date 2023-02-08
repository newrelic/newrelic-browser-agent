/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");

const { setup } = require("../utils/setup");

const setupData = setup();
const { baseEE } = setupData;

jil.browserTest("fn-start events for MutationObserver callbacks should have args", function (t) {
  t.plan(3);

  const { wrapMutation } = require("../../../src/common/wrap/index");

  wrapMutation(baseEE);

  var el = document.createElement("div");
  document.body.appendChild(el);

  var observer = new MutationObserver(function (mutationRecords, o) {
    t.equal(mutationRecords.length, 1, "callback gets one mutation record");
    t.equal(o, observer, "observer received in callback matches original observer");
  });

  baseEE.on("fn-start", function (args) {
    t.equal(args.length, 2, "fn-start event gets MutationObserver callback args");
  });

  observer.observe(el, { attributes: true });

  el.setAttribute("foo", "bar");
});
