/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

jil.browserTest('spa XHR readystatechange callback', function (t) {
  let helpers = require('./helpers')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [{
      name: 'ajax',
      children: [{
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }, {
        type: 'customTracer',
        attrs: {
          name: 'timer'
        },
        children: []
      }]
    }]
  })

  t.plan(2 + validator.count)

  setTimeout(function () {
    helpers.startInteraction(onInteractionStart, afterInteractionDone)
  })

  function onInteractionStart (cb) {
    let xhr = new XMLHttpRequest()

    xhr.addEventListener('readystatechange', function () {
      if (xhr.readyState !== 2) return
      setTimeout(newrelic.interaction().createTracer('timer', function () {}))
    })

    xhr.onload = cb

    xhr.open('GET', '/')
    xhr.send()

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return
      setTimeout(newrelic.interaction().createTracer('timer', function () {}))
    }
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
