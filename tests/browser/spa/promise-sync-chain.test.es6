/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('promise')

jil.browserTest('promise.then sync chains', supported, function (t) {
  let helpers = require('./helpers.es6')
  var validator = new helpers.InteractionValidator({
    attrs: {
      trigger: 'click'
    },
    name: 'interaction',
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: []
    }]
  })

  helpers.onAggregatorLoaded(function () {
    helpers.startInteraction(onInteractionStart, afterInteractionDone)
  })

  t.plan(validator.count + 14)

  function onInteractionStart (cb) {
    var promise = Promise.resolve(1)
    var rootId = helpers.currentNodeId()

    promise
      .then(function (val) {
        t.equal(val, 1, 'should get correct value in then callback 1')
        t.equal(helpers.currentNodeId(), rootId, 'id should be rootId')
        return 2
      })
      .then(function (val) {
        t.equal(val, 2, 'should get correct value in then callback 2')
        t.equal(helpers.currentNodeId(), rootId, 'id should be rootId')
        return 3
      })
      .then(function (val) {
        t.equal(val, 3, 'should get correct value in then callback 3')
        t.equal(helpers.currentNodeId(), rootId, 'id should be rootId')
      })

    promise
      .then(function (val) {
        t.equal(val, 1, 'should get correct value in then callback 4')
        t.equal(helpers.currentNodeId(), rootId, 'id should be rootId')
        return 4
      })
      .then(function (val) {
        t.equal(val, 4, 'should get correct value in then callback 5')
        t.equal(helpers.currentNodeId(), rootId, 'id should be rootId')
        return 5
      })
      .then(function (val) {
        t.equal(val, 5, 'should get correct value in then callback 6')
        t.equal(helpers.currentNodeId(), rootId, 'id should be rootId')
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          window.location.hash = '#' + Math.random()
          cb()
        }))
      })
  }

  function afterInteractionDone (interaction) {
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.ok(interaction.root.end, 'interaction should be finished')
    validator.validate(t, interaction)
    t.end()
  }
})
