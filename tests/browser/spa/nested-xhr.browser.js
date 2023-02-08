/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil');

jil.browserTest('spa nested XHR', function (t) {
  let helpers = require('./helpers');
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [
      {
        name: 'ajax',
        children: [
          {
            name: 'ajax',
            children: [],
          },
        ],
      },
    ],
  });

  t.plan(2 + validator.count);

  helpers.startInteraction(onInteractionStart, afterInteractionDone);

  function onInteractionStart(cb) {
    let xhr = new XMLHttpRequest();

    xhr.onload = function () {
      let xhr2 = new XMLHttpRequest();

      xhr2.onload = function () {
        cb();
      };

      xhr2.open('GET', '/');
      xhr2.send();
    };

    xhr.open('GET', '/');
    xhr.send();
  }

  function afterInteractionDone(interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time');
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain');
    validator.validate(t, interaction);
    t.end();
  }
});
