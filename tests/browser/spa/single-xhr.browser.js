/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");

jil.browserTest("spa single XHR", function (t) {
  let helpers = require("./helpers");
  let validator = new helpers.InteractionValidator({
    name: "interaction",
    children: [
      {
        name: "ajax",
        children: [
          {
            type: "customTracer",
            attrs: {
              name: "timer",
            },
            children: [],
          },
        ],
      },
    ],
  });

  t.plan(3 + validator.count);

  t.notok(helpers.currentNodeId(), "interaction should be null at first");

  helpers.startInteraction(onInteractionStart, afterInteractionDone);

  function onInteractionStart(cb) {
    let xhr = new XMLHttpRequest();
    let asserted = false;

    xhr.onreadystatechange = function () {
      if (xhr.readyState < 2) return;
      // This silly dance with asserted is to keep the number of assertions in
      // this test fixed.
      if (!asserted) {
        asserted = true;
        setTimeout(
          newrelic.interaction().createTracer("timer", function () {}),
          0
        );
      }
    };

    xhr.onload = cb;

    // This response is ~16 KB, big enough to generate multiple
    // readsystatechange callbacks in state 3 as more chunks come in.
    xhr.open("GET", "/slowresponse");
    xhr.send();
  }

  function afterInteractionDone(interaction) {
    t.ok(
      interaction.root.end,
      "interaction should be finished and have an end time"
    );
    t.notok(
      helpers.currentNodeId(),
      "interaction should be null outside of async chain"
    );
    validator.validate(t, interaction);
    t.end();
  }
});
