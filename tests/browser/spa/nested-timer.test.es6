import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('spa nested timers', supported, function (t) {
  let helpers = require('./helpers.es6')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      custom: {
        'after-2': true
      }
    },
    children: []
  })

  t.plan(2 + validator.count)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(() => {
      setTimeout(() => {
        newrelic.interaction().setAttribute('after-2', true)
        cb()
      })
    })
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
