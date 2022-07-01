/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('timer cutoff', supported, function (t) {
  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'outer': true,
        'included': true,
        'custom': true
      }
    },
    children: [{
      type: 'customTracer',
      children: [],
      attrs: {
        name: 'custom-long-timer'
      }
    }]
  })

  t.plan(3 + validator.count)
  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(function () {
      newrelic.interaction().setAttribute('outer', true)
      setTimeout(function () {
        newrelic.interaction().setAttribute('excluded', true)
      }, 999)

      setTimeout(newrelic.interaction().createTracer('custom-long-timer', function () {
        newrelic.interaction().setAttribute('custom', true)
        cb()
      }), 600)

      setTimeout(function () {
        newrelic.interaction().setAttribute('included', true)
      }, 50)
    }, 999)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('string values for duration', supported, function (t) {
  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'included': true
      }
    }
  })

  t.plan(3 + validator.count)
  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(function () {
      newrelic.interaction().setAttribute('included', true)
      cb()
    }, '500')

    setTimeout(function () {
      newrelic.interaction().setAttribute('excluded', true)
    }, '1500')
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
