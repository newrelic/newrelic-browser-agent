/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");

jil.browserTest("Promise.race", function (t) {
  let helpers = require("./helpers");
  var validator = new helpers.InteractionValidator({
    attrs: {
      trigger: "click",
    },
    name: "interaction",
    children: [
      {
        type: "customTracer",
        attrs: {
          name: "timer",
        },
        children: [],
      },
    ],
  });

  t.plan(validator.count + 3);

  helpers.startInteraction(onInteractionStart, afterInteractionDone);

  function onInteractionStart(cb) {
    var a = Promise.resolve(123);
    var b = Promise.resolve(456);
    var promise = Promise.race([a, b]);

    promise.then(function (val) {
      setTimeout(
        newrelic.interaction().createTracer("timer", function () {
          t.deepEqual(val, 123, "promise should yield correct value");
          window.location.hash = "#" + Math.random();
          cb();
        })
      );
    });
  }

  function afterInteractionDone(interaction) {
    t.notok(
      helpers.currentNodeId(),
      "interaction should be null outside of async chain"
    );
    t.ok(interaction.root.end, "interaction should be finished");
    validator.validate(t, interaction);
    t.end();
  }
});

jil.browserTest("Promise.race async accept", function (t) {
  if (navigator.userAgent.match(/Edge\/\d/)) {
    t.skip(
      "Promise.race is broken in edge 20, but fixed in latest release of edge which is not available in saucelabs"
    );
    t.end();
    return;
  }

  let helpers = require("./helpers");

  var validator = new helpers.InteractionValidator({
    attrs: {
      trigger: "click",
    },
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

  t.plan(validator.count + 4);

  helpers.startInteraction(onInteractionStart, afterInteractionDone);

  function onInteractionStart(cb) {
    var a = new Promise(function (resolve) {
      setTimeout(
        newrelic.interaction().createTracer("timer", function () {
          idOnAccept = helpers.currentNodeId();
          resolve(123);
        }),
        5
      );
    });
    var idOnAccept;
    var b = new Promise(function (resolve, reject) {
      setTimeout(
        newrelic.interaction().createTracer("timer", function () {
          reject(456);
          setTimeout(
            newrelic.interaction().createTracer("timer", function () {
              promise.then(function (val) {
                t.equal(val, 123, "should get accept value in delayed then");
                t.equal(
                  helpers.currentNodeId(),
                  idOnAccept,
                  "should have same node id as accept"
                );
                cb();
              });
            }),
            20
          );
        }),
        10
      );
    });

    var promise = Promise.race([a, b]);
  }

  function afterInteractionDone(interaction) {
    t.notok(
      helpers.currentNodeId(),
      "interaction should be null outside of async chain"
    );
    t.ok(interaction.root.end, "interaction should be finished");
    validator.validate(t, interaction);
    t.end();
  }
});
