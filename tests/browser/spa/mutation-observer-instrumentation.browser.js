/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
let supported = supportsMutationObserver.intersect(supportsEventListenerWrapping)

jil.browserTest('basic MutationObserver instrumentation', function (t) {
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
    }, {
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: []
    }]
  })

  t.plan(validator.count + 2)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  var el = document.createElement('div')
  var observer = new MutationObserver(function () {
    setTimeout(newrelic.interaction().createTracer('timer', function () {}))
  })

  observer.observe(el, {childList: true})

  function onInteractionStart (cb) {
    el.innerHTML = 'mutated'
    setTimeout(newrelic.interaction().createTracer('timer', cb))
  }

  function afterInteractionDone (interaction) {
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    t.ok(interaction.root.end, 'interaction should be finished')
    validator.validate(t, interaction)
    t.end()
  }
})
