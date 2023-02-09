/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

jil.browserTest('Promise.resolve', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    attrs: {
      trigger: 'click'
    },
    name: 'interaction',
    children: [
      {
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }
    ]
  })

  t.plan(validator.count + 3)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var promise = Promise.resolve(10)

    promise.then(function (val) {
      setTimeout(
        newrelic.interaction().createTracer('timer', function () {
          t.equal(val, 10, 'promise should yield correct value')
          window.location.hash = '#' + Math.random()
          cb()
        })
      )
    })
  }

  function afterInteractionDone (interaction) {
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.ok(interaction.root.end, 'interaction should be finished')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('promise.resolve with Promise argument', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    attrs: {
      trigger: 'click'
    },
    name: 'interaction',
    children: [
      {
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: [
          {
            type: 'customTracer',
            attrs: {
              name: 'timer'
            },
            children: []
          }
        ]
      }
    ]
  })

  t.plan(validator.count + 3)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var p0 = new Promise(function (resolve, reject) {
      setTimeout(
        newrelic.interaction().createTracer('timer', function () {
          resolve(123)
        })
      )
    })

    Promise.resolve(p0).then(function (val) {
      setTimeout(
        newrelic.interaction().createTracer('timer', function () {
          t.equal(val, 123, 'promise should yield correct value')
          window.location.hash = '#' + Math.random()
          cb()
        })
      )
    })
  }

  function afterInteractionDone (interaction) {
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.ok(interaction.root.end, 'interaction should be finished')
    validator.validate(t, interaction)
    t.end()
  }
})
