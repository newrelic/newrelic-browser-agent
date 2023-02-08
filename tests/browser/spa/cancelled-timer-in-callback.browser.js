/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil');

jil.browserTest('spa cancelled timer in callback', function (t) {
  let helpers = require('./helpers');

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [
      {
        name: 'ajax',
        children: [],
      },
    ],
  });

  t.plan(3 + validator.count);
  t.notok(helpers.currentNodeId(), 'interaction should be null at first');

  helpers.startInteraction(onInteractionStart, afterInteractionDone);

  function onInteractionStart(cb) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      let t = setTimeout(() => {
        t.fail('cancelled timer should never fire');
      });
      clearTimeout(t);
      cb();
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
