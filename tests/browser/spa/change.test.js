/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('spa change trigger', supported, function (t) {
  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    attrs: { trigger: 'change' },
    name: 'interaction',
    children: [{
      name: 'ajax',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    }]
  })

  t.plan(3 + validator.count)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone, {
    eventType: 'change'
  })

  function onInteractionStart (cb) {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', '/')
    xhr.onload = function () {
      setTimeout(newrelic.interaction().createTracer('timer', cb), 0)
    }
    xhr.send()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
