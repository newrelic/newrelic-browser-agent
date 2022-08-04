/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

jil.browserTest('callback timing', function (t) {
  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    jsTime: 100,
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      jsTime: 300,
      children: []
    }]
  })

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(() => newrelic.interaction().createTracer('timer', () => {
      blockFor(300)
      cb()
    })(), 200)

    blockFor(100)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('callback timing multiple callbacks', function (t) {
  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    jsTime: 100,
    children: [{
      name: 'ajax',
      jsTime: 400,
      children: []
    }]
  })

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var xhr = new XMLHttpRequest()

    xhr.addEventListener('load', function () {
      blockFor(100)
    })

    xhr.addEventListener('load', function () {
      blockFor(300)
      cb()
    })

    xhr.open('GET', '/')
    xhr.send()
    blockFor(100)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('callback timing microtasks', function (t) {
  // can't use multiple matchers in same file
  if (!window.Promise) {
    t.end()
    return
  }

  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    jsTime: 400,
    children: []
  })

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    Promise.resolve().then(function () {
      blockFor(300)
      cb()
    })

    blockFor(100)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

function blockFor (ms) {
  let helpers = require('./helpers')
  var start = helpers.now()
  var data = 0
  while (helpers.now() - start <= ms) data ^= start
  return data
}
