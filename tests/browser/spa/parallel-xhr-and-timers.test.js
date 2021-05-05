/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('spa parallel XHRs and timers', supported, function (t) {
  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [{
      name: 'ajax',
      children: []
    }, {
      name: 'ajax',
      children: []
    }, {
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: []
    }, {
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: []
    }]
  })

  t.plan(2 + validator.count)
  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    let remaining = 4
    let xhr1 = new XMLHttpRequest()
    let xhr2 = new XMLHttpRequest()

    xhr1.onload = xhrOrTimerDone
    xhr2.onload = xhrOrTimerDone

    xhr1.open('GET', '/')
    xhr2.open('GET', '/')
    xhr1.send()
    xhr2.send()

    setTimeout(newrelic.interaction().createTracer('timer', xhrOrTimerDone), Math.random() * 10)
    setTimeout(newrelic.interaction().createTracer('timer', xhrOrTimerDone), Math.random() * 10)

    function xhrOrTimerDone () {
      remaining--
      if (remaining) return
      cb()
    }
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
