/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
let cleanUrl = require('../../../src/common/url/clean-url').cleanURL

if (process.browser) {
  var helpers = require('./helpers')
  var loaded = false
  helpers.onWindowLoad(() => {
    loaded = true
  })
}

jil.browserTest('spa interaction triggered by hashchange + popstate', function (t) {
  if (!helpers.emitsPopstateEventOnHashChanges()) {
    t.skip('skipping popstate test in browser that does not emit popstate event on hash changes')
    t.end()
    return
  }

  let originalURL = window.location.toString()
  let hashFragment = 'otherurl'

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [
      {
        type: 'customTracer',
        attrs: {
          name: 'onPopstate'
        },
        children: []
      }
    ]
  })

  t.plan(4 + validator.count)

  checkLoaded()

  function checkLoaded () {
    if (loaded) {
      setTimeout(function () {
        window.location.hash = hashFragment
        helpers.startInteraction(onInteractionStart, afterInteractionDone, {
          eventType: 'popstate'
        })
      })
    } else {
      setTimeout(checkLoaded, 100)
    }
  }

  function onInteractionStart (cb) {
    setTimeout(newrelic.interaction().createTracer('onPopstate', cb))
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')

    let root = interaction.root
    let actualOldUrl = cleanUrl(root.attrs.oldURL, true)
    let actualNewUrl = cleanUrl(root.attrs.newURL, true)

    let expectedOldUrl =
      window.location.protocol + '//' + window.location.host + window.location.pathname + '#' + hashFragment
    let expectedNewUrl = cleanUrl(originalURL, true)

    t.equal(actualOldUrl, expectedOldUrl, 'old url should be the url navigated from')
    t.equal(actualNewUrl, expectedNewUrl, 'new url should be the current url')
    validator.validate(t, interaction)
    t.end()
  }
})
