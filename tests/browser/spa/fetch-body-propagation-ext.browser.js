/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

jil.browserTest('spa single fetch with formData', function (t) {
  // check if Request.formData errors, see comment below
  var req = new Request('/formdata', { method: 'POST', body: new FormData() })
  if (req.formData) {
    req.formData().then(
      function () {
        runTest()
      },
      function (err) {
        // Request.formData() throws an error in Chrome (starting in 60), but not in Firefox
        // Firefox has had this feature longer, allowing the test to pass in case this is
        // a bug in Chrome and the behavior changes in the future
        t.comment('Request.formData errored, skipping test. The error was: ' + err)
        t.ok(true, 'since there must be at least one assertion')
        t.end()
      }
    )
  } else {
    runTest()
  }

  function runTest() {
    let helpers = require('./helpers')
    let validator = new helpers.InteractionValidator({
      type: 'interaction',
      children: [
        {
          type: 'customTracer',
          attrs: {
            name: 'timer',
          },
          children: [],
        },
      ],
    })

    t.plan(3 + validator.count)

    t.notok(helpers.currentNodeId(), 'interaction should be null at first')

    helpers.startInteraction(onInteractionStart, afterInteractionDone)

    function onInteractionStart(cb) {
      var req = new Request('/formdata', {
        method: 'POST',
        body: new FormData(),
      })

      if (req.formData) {
        req.formData().then(function () {
          setTimeout(newrelic.interaction().createTracer('timer', cb), 0)
        }, fail)
      } else {
        req.arrayBuffer().then(function () {
          setTimeout(newrelic.interaction().createTracer('timer', cb), 0)
        }, fail)
      }
    }

    function fail(err) {
      t.error(err)
    }

    function afterInteractionDone(interaction) {
      t.ok(interaction.root.end, 'interaction should be finished and have an end time')
      t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
      validator.validate(t, interaction)
      t.end()
    }
  }
})
