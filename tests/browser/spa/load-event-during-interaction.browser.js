/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

if (process.browser) {
  var helpers = require('./helpers')
  helpers.onWindowLoad(() => {
    // if interaction were active this would add a note and fail validation
    setTimeout(function () {}, 0)
  })
}

jil.browserTest('load event during interaction', function (t) {
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [],
  })

  t.plan(3 + validator.count)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart(cb) {
    setTimeout(cb, 10)
  }

  function afterInteractionDone(interaction) {
    t.ok(interaction.root.end, 'interaction should have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
