/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('spa single timer', supported, function (t) {
  let helpers = require('./helpers.es6')
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

  t.plan(4 + validator.count)
  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(newrelic.interaction().createTracer('timer', () => {
      var start = helpers.now()
      while (helpers.now() - start <= 100) continue
      cb()
    }), 50)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.ok(interaction.root.children[0].attrs.tracedTime >= 100, 'should record traced time')
    t.end()
  }
})
