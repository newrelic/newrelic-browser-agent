import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('promise')

jil.browserTest('promise.reject', supported, function (t) {
  let helpers = require('./helpers.es6')
  var validator = new helpers.InteractionValidator({
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
    var promise = Promise.reject(10)

    promise.catch(function (val) {
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        t.equal(val, 10, 'promise should yield correct value')
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
