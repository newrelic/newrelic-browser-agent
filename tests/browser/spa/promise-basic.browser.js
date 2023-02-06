/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var unwrappedPromise = global.Promise

const jil = require('jil')

jil.browserTest('basic promise chain', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    attrs: {
      trigger: 'click',
      custom: {
        'in-catch': true
      }
    },
    name: 'interaction',
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timer-in-first-promise'
      },
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer-in-second-promise'
        },
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      }]
    }]
  })

  t.plan(validator.count + 2)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    new Promise(function (resolve, reject) {
      setTimeout(newrelic.interaction().createTracer('timer-in-first-promise', function () {
        resolve(1)
      }), 1)
    })
    .then(() => {
      return new Promise(function (resolve, reject) {
        setTimeout(newrelic.interaction().createTracer('timer-in-second-promise', function () {
          reject(2)
        }), 2)
      })
    })
    .catch(function () {}).catch(function () {}).then(() => {
      newrelic.interaction().setAttribute('in-catch', true)
      setTimeout(newrelic.interaction().createTracer('timer', cb), 3)
    })
  }

  function afterInteractionDone (interaction) {
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.ok(interaction.root.end, 'interaction should be finished')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('instanceof', function diferTest (t) {
  var promise = Promise.resolve()
  var unwrapped = unwrappedPromise.resolve()

  t.ok(promise instanceof Promise, 'global (wrapped) Promise.resolve should return an instance of itself')
  t.ok(promise instanceof unwrappedPromise, 'the wrapped promise should be an instance of the original Promise')
  t.ok(unwrapped instanceof unwrappedPromise, 'original Promise.resolve should return an instance of itself')
  t.end()
})

jil.browserTest('Promise throw in executor', function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
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

  t.plan(validator.count + 3)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var thrownError = new Error('123')
    var promise = new Promise(function (resolve, reject) {
      throw thrownError
    })

    promise.catch(function (val) {
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        t.equal(val, thrownError, 'promise should yield the error that was thrown in executor')
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
