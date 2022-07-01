/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

jil.browserTest('initial page load timing', function (t) {
  var helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    jsTime: 0,
    attrs: {
      custom: {
        'from-start': true
      }
    },
    children: []
  })

  t.plan(5 + validator.count)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone, {eventType: 'initialPageLoad'})

  function onInteractionStart (cb) {
    let x = 0
    let deadline = helpers.now() + 75
    while (helpers.now() <= deadline) { x++ }
    let e = window.document.createElement('div')
    e.innerHTML = x
    newrelic.interaction().setAttribute('from-start', true)
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.attrs.trigger === 'initialPageLoad', 'event should be initial page load')
    t.ok(interaction.root.end, 'interaction should have an end time')
    t.ok(interaction.root.attrs.id, 'interaction should have assigned uid')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
