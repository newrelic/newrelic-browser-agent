/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");

jil.browserTest("spa aggregator receives complete interaction when hashchange fires after finish", function (t) {
  let helpers = require("./helpers");
  let originalUrl = window.location.toString();

  var expected = {
    name: "interaction",
    attrs: {
      trigger: "click",
      initialPageURL: originalUrl,
      oldURL: originalUrl,
      newURL: "placeholder",
      custom: {
        "after-hashchange": true,
      },
    },
    children: [
      {
        name: "ajax",
        children: [],
      },
    ],
  };

  let validator = new helpers.InteractionValidator(expected);

  t.plan(2 + validator.count);

  setTimeout(function () {
    helpers.startInteraction(onInteractionStart, afterInteractionDone);
  });

  function onInteractionStart(cb) {
    let xhr = new XMLHttpRequest();

    xhr.onload = function () {
      window.location.hash = Math.random();
      expected.attrs.newURL = window.location.toString();
    };

    // Validates that async work that is spawned by the hash change
    // will be included in the interaction.
    window.addEventListener("hashchange", function () {
      setTimeout(function () {
        newrelic.interaction().setAttribute("after-hashchange", true);
        cb();
      }, 10);
    });

    xhr.open("GET", "/");
    xhr.send();
  }

  function afterInteractionDone(interaction) {
    t.ok(interaction.root.attrs.newURL !== interaction.root.attrs.oldURL, "old and new URLs should be different");
    t.ok(interaction.root.end, "interaction should be finished");
    validator.validate(t, interaction);
    t.end();
  }
});
