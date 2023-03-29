/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('../../../tools/jil/driver/browser.js')

if (process.browser) {
  var helpers = require('./helpers')
  var loaded = false
  helpers.onWindowLoad(() => { loaded = true })
}

jil.browserTest('spa interaction triggered by pushstate + popstate', function (t) {
  if (!window.history.pushState) {
    t.skip('skipping SPA test in browser that does not support pushState')
    t.end()
    return
  }

  let originalURL = window.location.toString()

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: []
    }]
  })

  t.plan(5 + validator.count)

  setTimeout(checkLoaded, 100)

  function checkLoaded () {
    if (loaded) {
      window.history.pushState({}, '', '/newurl')
      helpers.startInteraction(onInteractionStart, afterInteractionDone, { eventType: 'popstate' })
    } else {
      setTimeout(checkLoaded, 100)
    }
  }

  function onInteractionStart (cb) {
    setTimeout(newrelic.interaction().createTracer('timer', cb))
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.ok(interaction.routeChange, 'should be a route change')

    let root = interaction.root
    t.equal(root.attrs.oldURL, window.location.protocol + '//' + window.location.host + '/newurl', 'old url should be the url navigated from')
    t.equal(root.attrs.newURL, originalURL, 'new url should be the current url')
    validator.validate(t, interaction)
    t.end()
  }
})
