/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

if (process.browser) {
  var helpers = require('./helpers')
}

jil.browserTest('spa hashchange in second event callback', function (t) {
  var originalUrl = '' + window.location
  var expected = {
    name: 'interaction',
    attrs: {
      trigger: 'click',
      initialPageURL: originalUrl,
      oldURL: 'placeholder',
      newURL: 'placeholder',
    },
    children: [
      {
        type: 'customTracer',
        attrs: {
          name: 'first-click',
        },
        children: [],
      },
      {
        type: 'customTracer',
        attrs: {
          name: 'after-hashchange',
        },
        children: [],
      },
    ],
  }

  let validator = new helpers.InteractionValidator(expected)

  t.plan(validator.count + 6)

  window.addEventListener(
    'click',
    () => {
      setTimeout(
        newrelic.interaction().createTracer('first-click', function () {
          t.ok(true, 'first click handler')
        }),
        0
      )
    },
    true
  )

  jil.onWindowLoaded(() => {
    expected.attrs.oldURL = window.location + ''
    setTimeout(() => helpers.startInteraction(onInteractionStart, afterInteractionDone), 100)
  })

  function onInteractionStart(cb) {
    t.ok(true, '2nd click handler')
    window.addEventListener('hashchange', () => {
      t.ok(true, 'in hashchange handler')
      expected.attrs.newURL = window.location.toString()
      setTimeout(
        newrelic.interaction().createTracer('after-hashchange', function () {
          cb()
        }),
        5
      )
    })

    window.location.hash = '#' + Math.random()
  }

  function afterInteractionDone(interaction) {
    t.ok(interaction.root.attrs.newURL !== interaction.root.attrs.oldURL, 'old and new URLs should be different')
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
