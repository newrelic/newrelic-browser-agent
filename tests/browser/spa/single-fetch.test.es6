import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('fetch')

jil.browserTest('spa single fetch', supported, function (t) {
  let helpers = require('./helpers.es6')
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
      }]
    }]
  })

  t.plan(3 + validator.count)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    window.fetch('/').then(function () {
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
