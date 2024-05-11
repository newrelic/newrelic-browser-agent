/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('../../../tools/jil/driver/browser.js')
const { now } = require('./helpers')

if (process.browser) {
  let helpers = require('./helpers')
  var loaded = false
  helpers.onWindowLoad(() => {
    loaded = true
  })
}

// Regression test that an interaction cannot have more than a set number of child nodes (MAX_NODES).
jil.browserTest('Exceeding max SPA nodes', function (t) {
  let helpers = require('./helpers')
  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  start()

  // if test runs before window load, then the error in the try/catch below would not be caught
  // due to buffered events running in a different callstack
  function start () {
    if (loaded) {
      helpers.startInteraction(onInteractionStart, onInteractionFinished)
    } else {
      setTimeout(start, 100)
    }
  }

  function onInteractionStart (cb) {
    window.NREUM.init = {
      distributed_tracing: {
        enabled: true,
        allowed_origins: ['localhost:3333']
      }
    }
    window.NREUM.loader_config = {
      accountID: 1,
      agentID: 1,
      trustKey: 1
    }

    for (var i = 0; i <= 128; i++) {
      try {
        window.fetch('/json')
      } catch (e) {
        t.error(e, 'Exceeding the number of child nodes in an interaction should not produce an error')
      }
    }
    cb()
  }

  function onInteractionFinished (interaction) {
    t.end()
  }
})

