/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil');

jil.browserTest('spa keypress trigger', function (t) {
  let helpers = require('./helpers');
  let validator = new helpers.InteractionValidator({
    attrs: { trigger: 'keypress' },
    name: 'interaction',
    children: [
      {
        name: 'ajax',
        children: [
          {
            type: 'customTracer',
            attrs: {
              name: 'timer',
            },
            children: [],
          },
        ],
      },
    ],
  });

  t.plan(3 + validator.count);

  t.notok(helpers.currentNodeId(), 'interaction should be null at first');

  helpers.startInteraction(onInteractionStart, afterInteractionDone, {
    eventType: 'keypress',
  });

  function onInteractionStart(cb) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/');
    xhr.onload = function () {
      setTimeout(newrelic.interaction().createTracer('timer', cb), 0);
    };
    xhr.send();
  }

  function afterInteractionDone(interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time');
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain');
    validator.validate(t, interaction);
    t.end();
  }
});

jil.browserTest('spa keyup trigger', function (t) {
  let helpers = require('./helpers');
  let validator = new helpers.InteractionValidator({
    attrs: { trigger: 'keyup' },
    name: 'interaction',
    children: [
      {
        name: 'ajax',
        children: [
          {
            type: 'customTracer',
            attrs: {
              name: 'timer',
            },
            children: [],
          },
        ],
      },
    ],
  });

  t.plan(3 + validator.count);

  t.notok(helpers.currentNodeId(), 'interaction should be null at first');

  helpers.startInteraction(onInteractionStart, afterInteractionDone, {
    eventType: 'keyup',
  });

  function onInteractionStart(cb) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/');
    xhr.onload = function () {
      setTimeout(newrelic.interaction().createTracer('timer', cb), 0);
    };
    xhr.send();
  }

  function afterInteractionDone(interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time');
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain');
    validator.validate(t, interaction);
    t.end();
  }
});

jil.browserTest('spa keydown trigger', function (t) {
  let helpers = require('./helpers');
  let validator = new helpers.InteractionValidator({
    attrs: { trigger: 'keydown' },
    name: 'interaction',
    children: [
      {
        name: 'ajax',
        children: [
          {
            type: 'customTracer',
            attrs: {
              name: 'timer',
            },
            children: [],
          },
        ],
      },
    ],
  });

  t.plan(3 + validator.count);

  t.notok(helpers.currentNodeId(), 'interaction should be null at first');

  helpers.startInteraction(onInteractionStart, afterInteractionDone, {
    eventType: 'keydown',
  });

  function onInteractionStart(cb) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/');
    xhr.onload = function () {
      setTimeout(newrelic.interaction().createTracer('timer', cb), 0);
    };
    xhr.send();
  }

  function afterInteractionDone(interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time');
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain');
    validator.validate(t, interaction);
    t.end();
  }
});
