/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

if (process.browser) {
  let helpers = require('./helpers')
  var loaded = false
  helpers.onWindowLoad(() => {
    loaded = true
  })
}

var bodyMethods = ['arrayBuffer', 'blob', 'json', 'text']

bodyMethods.forEach((bodyMethod) => {
  jil.browserTest('Response.' + bodyMethod, function (t) {
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
            name: 'timer'
          },
          children: []
        }]
      }]
    })

    t.plan(4 + validator.count)

    t.notok(helpers.currentNodeId(), 'interaction should be null at first')

    helpers.startInteraction(onInteractionStart, afterInteractionDone)

    var resTime

    function onInteractionStart (cb) {
      window.fetch('/json')
        .then(function (res) {
          const { now } = require('../../../src/common/timing/now')
          resTime = now()
          return res[bodyMethod]()
        }).then(function () {
          setTimeout(newrelic.interaction().createTracer('timer', function () {
            cb()
          }), 0)
        })
      cb()
    }

    function afterInteractionDone (interaction) {
      t.ok(interaction.root.children[0].end <= resTime, 'resTime should be after we got response')
      t.ok(interaction.root.end, 'interaction should be finished and have an end time')
      t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
      validator.validate(t, interaction)
      t.end()
    }
  })
})

// Regression test that an interaction cannot have more than a set number of child nodes (MAX_NODES).
jil.browserTest('Exceeding max SPA nodes', function (t) {
  let helpers = require('./helpers')
  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  start()

  // if test runs before window load, then the error in the try/catch below would not be caught
  // due to buffered events running in a different callstack
  function start () {
    if (loaded) {
      helpers.startInteraction(onInteractionStart, onInteractionFinished)
    } else {
      setTimeout(start, 100)
    }
  }

  function onInteractionStart (cb) {
    window.NREUM.init = {
      distributed_tracing: {
        enabled: true,
        allowed_origins: ['localhost:3333']
      }
    }
    window.NREUM.loader_config = {
      accountID: 1,
      agentID: 1,
      trustKey: 1
    }

    for (var i = 0; i <= 128; i++) {
      try {
        window.fetch('/json')
      } catch (e) {
        t.error(e, 'Exceeding the number of child nodes in an interaction should not produce an error')
      }
    }
    cb()
  }

  function onInteractionFinished (interaction) {
    t.end()
  }
})

jil.browserTest('Response.formData', function (t) {
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
          name: 'timer'
        },
        children: []
      }]
    }]
  })

  t.plan(4 + validator.count)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  var resTime

  function onInteractionStart (cb) {
    window.fetch('/formdata', { method: 'POST', body: new FormData() }).then(function (res) {
      const { now } = require('../../../src/common/timing/now')
      resTime = now()
      if (res.formData) {
        res.formData().catch(function () {
          // can't parse as formdata
          setTimeout(newrelic.interaction().createTracer('timer', cb), 0)
        })
      } else {
        setTimeout(newrelic.interaction().createTracer('timer', cb), 0)
      }
    })
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.children[0].end <= resTime, 'resTime should be after res was received')
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

bodyMethods.forEach((bodyMethod) => {
  jil.browserTest('Request.' + bodyMethod, function (t) {
    let helpers = require('./helpers')
    let validator = new helpers.InteractionValidator({
      type: 'interaction',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    })

    t.plan(3 + validator.count)

    t.notok(helpers.currentNodeId(), 'interaction should be null at first')

    helpers.startInteraction(onInteractionStart, afterInteractionDone)

    function onInteractionStart (cb) {
      var req = new Request('/json', { method: 'POST', body: '{}' })
      req[bodyMethod]().then(function () {
        setTimeout(newrelic.interaction().createTracer('timer', cb), 0)
      })
    }

    function afterInteractionDone (interaction) {
      t.ok(interaction.root.end, 'interaction should be finished and have an end time')
      t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
      validator.validate(t, interaction)
      t.end()
    }
  })
})
