/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");

jil.browserTest("multiple XHRs with the same callback function", function (t) {
  let helpers = require("./helpers");

  let i = 0;
  let xhrs = [];
  let interactions = [];
  let callbacks = [];
  let remaining = 2;

  var validator = new helpers.InteractionValidator({
    name: "interaction",
    children: [
      {
        name: "ajax",
        children: [],
      },
    ],
  });

  setTimeout(
    () => helpers.startInteraction(onInteractionStart, afterInteractionFinish),
    0
  );
  setTimeout(
    () => helpers.startInteraction(onInteractionStart, afterInteractionFinish),
    10
  );

  function onInteractionStart(cb) {
    let xhr = new XMLHttpRequest();
    xhr.idx = i;
    xhrs.push(xhr);
    callbacks.push(cb);

    xhr.addEventListener("load", xhrDone, false);
    xhr.open("GET", "/" + i);
    xhr.send();

    i++;
  }

  function xhrDone() {
    let idx = xhrs.indexOf(this);
    let cb = callbacks[idx];
    t.ok(
      idx >= 0,
      "should be able to find XHR " +
        this.idx +
        " in list of launched XHRs, idx = " +
        idx
    );
    cb();
  }

  function afterInteractionFinish(interaction) {
    t.notok(
      helpers.currentNodeId(),
      "interaction should be null outside of async chain"
    );
    interactions.push(interaction);
    validator.validate(t, interaction);

    if (--remaining) return;

    t.ok(
      interactions[0].root.end,
      "xhr 0 interaction should be finished and have an end time"
    );
    t.ok(
      interactions[1].root.end,
      "xhr 1 interaction should be finished and have an end time"
    );
    t.notEqual(
      interactions[0].root.id,
      interactions[1].root.id,
      "should have 2 different interactions"
    );
    t.end();
  }
});
