/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

if (process.browser) {
  var helpers = require('./helpers')
  var loaded = false
  helpers.onWindowLoad(() => {
    loaded = true
  })
}

jil.browserTest('node is not restored for ended interaction', function (t) {
  t.plan(6)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  start()

  function start() {
    if (loaded) {
      helpers.startInteraction(onInteractionStart, afterInteractionDone, {
        eventType: 'click'
      })
    } else {
      setTimeout(start, 100)
    }
  }

  function onInteractionStart (cb) {
    t.ok(helpers.currentNodeId(), 'should be inside an interaction at the beginning')
    setTimeout(function() {
      t.ok(helpers.currentNodeId(), 'should be inside an interaction in timeout 1')
      newrelic.interaction().end()
    }, 100)

    // even though the setTimeout callback is associated with the interaction,
    // at the time it is called, the interaction node should not be restored
    // since it runs after the interaction has already finished
    setTimeout(function() {
      t.notOk(helpers.currentNodeId(), 'should not be inside an interaction in timeout 2')
    }, 200)

    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
  }
})
