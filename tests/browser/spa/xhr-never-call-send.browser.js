/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('../../../tools/jil/driver/browser.js')

jil.browserTest('interaction does not include xhrs that are not sent', function (t) {
  let helpers = require('./helpers')
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

  t.plan(3 + validator.count)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    let xhr = new XMLHttpRequest()

    xhr.open('GET', '/')
    var tracer = newrelic.interaction().createTracer('timer', cb)
    setTimeout(tracer, 0)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
