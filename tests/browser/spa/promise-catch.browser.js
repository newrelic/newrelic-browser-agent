/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");

jil.browserTest("promise.catch", function (t) {
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
    var promise = new Promise(function (resolve, reject) {
      reject(10);
    });

    promise.catch(function (val) {
      setTimeout(
        newrelic.interaction().createTracer("timer", function () {
          t.equal(val, 10, "promise should yield correct value");
          window.location.hash = "#" + Math.random();
          cb();
        })
      );
    });
  }

  function afterInteractionDone(interaction) {
    t.notok(helpers.currentNodeId(), "interaction should be null outside of async chain");
    t.ok(interaction.root.end, "interaction should be finished");
    validator.validate(t, interaction);
    t.end();
  }
});

jil.browserTest("promise.catch chain with async", function (t) {
  let helpers = require("./helpers");

  if (!window.Promise) {
    t.skip("promises are required for this test");
    t.end();
    return;
  }

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
    var promise = Promise.reject(10);

    promise
      .catch(function (val) {
        return new Promise(function wait(resolve, reject) {
          setTimeout(
            newrelic.interaction().createTracer("timer", function () {
              t.strictEqual(val, 10, "should get reject value in first catch");
              reject(123);
            }),
            5
          );
        });
      })
      .catch(function validate(val) {
        t.strictEqual(val, 123, "should get reject value in 2nd catch");

        setTimeout(
          newrelic.interaction().createTracer("timer", function () {
            window.location.hash = "#" + Math.random();
            cb();
          })
        );
      });
  }

  function afterInteractionDone(interaction) {
    t.notok(helpers.currentNodeId(), "interaction should be null outside of async chain");
    t.ok(interaction.root.end, "interaction should be finished");
    validator.validate(t, interaction);
    t.end();
  }
});

jil.browserTest("throw in promise.catch", function (t) {
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
    var thrownError = new Error(123);
    var promise = new Promise(function (resolve, reject) {
      reject(10);
    });

    promise
      .catch(function (val) {
        throw thrownError;
      })
      .catch(function (val) {
        t.equal(val, thrownError, "should be resolved with thrown error");
        setTimeout(
          newrelic.interaction().createTracer("timer", function () {
            window.location.hash = "#" + Math.random();
            cb();
          })
        );
      });
  }

  function afterInteractionDone(interaction) {
    t.notok(helpers.currentNodeId(), "interaction should be null outside of async chain");
    t.ok(interaction.root.end, "interaction should be finished");
    validator.validate(t, interaction);
    t.end();
  }
});
