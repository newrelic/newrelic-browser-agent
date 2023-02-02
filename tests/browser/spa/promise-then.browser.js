/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require("jil");

jil.browserTest("promise.then", function (t) {
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
      resolve(10);
    });

    promise.then(function (val) {
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
    t.notok(
      helpers.currentNodeId(),
      "interaction should be null outside of async chain"
    );
    t.ok(interaction.root.end, "interaction should be finished");
    validator.validate(t, interaction);
    t.end();
  }
});

jil.browserTest("promise.then chain with async", function (t) {
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
    var promise = Promise.resolve(10);

    promise
      .then(function (val) {
        return new Promise(function wait(resolve) {
          setTimeout(
            newrelic.interaction().createTracer("timer", function () {
              t.strictEqual(val, 10, "should get resolve value in 1st then");
              resolve(123);
            }),
            5
          );
        });
      })
      .then(function validate(val) {
        t.strictEqual(val, 123, "should get resolve value in 2nd then");

        setTimeout(
          newrelic.interaction().createTracer("timer", function () {
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

jil.browserTest("promise.then chain with async with rejection", function (t) {
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
      .then(null, function (val) {
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
      .then(null, function validate(val) {
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
    t.notok(
      helpers.currentNodeId(),
      "interaction should be null outside of async chain"
    );
    t.ok(interaction.root.end, "interaction should be finished");
    validator.validate(t, interaction);
    t.end();
  }
});

jil.browserTest("throw in promise.then", function (t) {
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
        children: [],
      },
    ],
  });

  t.plan(validator.count + 3);

  helpers.startInteraction(onInteractionStart, afterInteractionDone);

  function onInteractionStart(cb) {
    var thrownError = new Error(123);
    var promise = new Promise(function (resolve, reject) {
      resolve(10);
    });

    promise
      .then(function (val) {
        throw thrownError;
      })
      .catch(function (val) {
        newrelic.interaction().setAttribute("foo", 1);
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
    t.notok(
      helpers.currentNodeId(),
      "interaction should be null outside of async chain"
    );
    t.ok(interaction.root.end, "interaction should be finished");
    validator.validate(t, interaction);
    t.end();
  }
});

jil.browserTest("throw in promise.then", function (t) {
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
    type: "interaction",
    children: [
      {
        type: "ajax",
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

  t.plan(validator.count + 2);

  helpers.startInteraction(onInteractionStart, afterInteractionDone);

  function onInteractionStart(cb) {
    Promise.resolve()
      .then(function (val) {
        return new Promise((resolve) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", "/");
          xhr.onload = function () {
            resolve();
          };
          xhr.send();
        });
      })
      .then(() => 123)
      .then(function (val) {
        setTimeout(
          newrelic.interaction().createTracer("timer", function () {
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
