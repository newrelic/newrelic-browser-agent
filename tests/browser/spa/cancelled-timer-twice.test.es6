/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('spa cancelled timer in callback', supported, function (t) {
  let helpers = require('./helpers.es6')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [
      {
        name: 'ajax',
        children: [
          {
            name: 'customTracer',
            children: []
          }
        ]
      }
    ]
  })

  t.plan(4 + validator.count)
  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var xhr = new XMLHttpRequest()
    xhr.onload = function () {
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        t.ok(true, 'first timer fired')
      }), 100)

      let timer = setTimeout(() => {
        t.fail('cancelled timer should never fire')
      })

      // We're intentionally calling clearTimeout twice here to ensure that
      // the second call doesn't end the interaction prematurely.
      clearTimeout(timer)
      clearTimeout(timer)

      cb()
    }
    xhr.open('GET', '/')
    xhr.send()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
