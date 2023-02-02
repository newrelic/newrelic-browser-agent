/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");

jil.browserTest("spa multiple event handlers", function (t) {
  let helpers = require("./helpers");

  if (!window.performance) {
    t.skip(
      "skipping SPA test in browser that does not support window.performance"
    );
    t.end();
    return;
  }

  let validator = new helpers.InteractionValidator({
    name: "interaction",
    children: [
      {
        type: "customTracer",
        attrs: {
          name: "timer",
        },
        children: [],
      },
      {
        type: "customTracer",
        attrs: {
          name: "timer",
        },
        children: [],
      },
    ],
  });

  t.plan(3 + validator.count);

  t.notok(helpers.currentNodeId(), "interaction should be null at first");

  let el = document.createElement("div");

  el.addEventListener("click", () => {
    setTimeout(newrelic.interaction().createTracer("timer", function () {}));
  });

  el.addEventListener("click", () => {
    let deadline = helpers.now() + 1000;
    let x = 0;
    while (helpers.now() <= deadline) {
      x++;
    }
    // do something with x to prevent the loop from being optimized out
    let div = document.createElement("div");
    document.body.appendChild(div);
    div.innerHTML = x;
    setTimeout(newrelic.interaction().createTracer("timer", function () {}));
  });

  helpers.startInteraction(onInteractionStart, afterInteractionDone, {
    element: el,
  });

  function onInteractionStart(cb) {
    cb();
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
