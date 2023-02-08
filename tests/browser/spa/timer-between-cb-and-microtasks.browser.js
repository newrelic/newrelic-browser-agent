/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil');

jil.browserTest('timer between cb and microtasks', function (t) {
  let helpers = require('./helpers');
  if (!window.performance) {
    t.skip('window.performance is required for this test');
    t.end();
    return;
  }

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [
      {
        type: 'customTracer',
        attrs: {
          name: 'timer',
        },
        children: [],
      },
    ],
  });

  t.plan(2 + validator.count);

  setTimeout(function () {
    setTimeout(function () {}, 50);

    helpers.startInteraction(onInteractionStart, afterInteractionDone);
  }, 0);

  function onInteractionStart(cb) {
    // Perform some work to block the event loop
    let x = 0;
    let deadline = helpers.now() + 75;
    while (helpers.now() <= deadline) {
      x++;
    }
    let e = document.createElement('div');
    e.innerHTML = x;

    Promise.resolve().then(function () {
      setTimeout(newrelic.interaction().createTracer('timer', cb));
    });
  }

  function afterInteractionDone(interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time');
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain');
    validator.validate(t, interaction);
    t.end();
  }
});
