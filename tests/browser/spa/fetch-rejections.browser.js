/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

jil.browserTest('fetch.reject', function (t) {
  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    type: 'interaction',
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'promise'
      },
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    }]
  })

  t.plan(4 + validator.count)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    window.fetch('http://not.a.real.website').catch(function (err) {
      t.ok(err, 'should get error')
      return newrelic.interaction().createTracer('promise', () => {
        return Promise.resolve()
      })()
    }).then(function () {
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        cb()
      }), 100)
    })
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('fetch body.reject', function (t) {
  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    type: 'interaction',
    children: [{
      type: 'ajax',
      attrs: {
        isFetch: true
      },
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'promise'
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

  t.plan(4 + validator.count)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    window.fetch('/').then(function (res) {
      return res.json().catch((err) => {
        t.ok(err, 'should get error')
        return newrelic.interaction().createTracer('promise', () => {
          return Promise.resolve()
        })()
      })
    }).then(function () {
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        cb()
      }), 0)
    })
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
