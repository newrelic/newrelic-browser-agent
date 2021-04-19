/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('promise')

jil.browserTest('Promise.all', supported, function (t) {
  let helpers = require('./helpers.es6')

  let validator = new helpers.InteractionValidator({
    attrs: {
      trigger: 'click'
    },
    name: 'interaction',
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timer'
      }
    }]
  })

  t.plan(validator.count + 3)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var a = Promise.resolve(123)
    var b = Promise.resolve(456)
    var promise = Promise.all([a, b])

    promise.then(function (val) {
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        t.deepEqual(val, [123, 456], 'promise should yield correct value')
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

jil.browserTest('Promise.all async resolve after rejected', supported, function (t) {
  let helpers = require('./helpers.es6')

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
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      },
      {
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }
    ]
  })

  t.plan(validator.count + 5)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var a = Promise.reject(123)
    var idOnReject
    var b = new Promise(function (resolve) {
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        resolve(456)
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          promise.catch(function (val) {
            t.equal(val, 123, 'should get reject value in delayed catch')
            t.equal(helpers.currentNodeId(), idOnReject, 'should have same node id as other catch')
            cb()
          })
        }), 20)
      }), 10)
    })

    var promise = Promise.all([a, b])

    promise.catch(function (val) {
      idOnReject = helpers.currentNodeId()
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        t.equal(val, 123, 'should get reject value in fist catch')
        window.location.hash = '#' + Math.random()
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
