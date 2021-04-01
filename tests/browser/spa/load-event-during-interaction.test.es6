import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('wrappableAddEventListener')

if (process.browser) {
  var helpers = require('./helpers.es6')
  helpers.onWindowLoad(() => {
    // if interaction were active this would add a note and fail validation
    setTimeout(function () {}, 0)
  })
}

jil.browserTest('load event during interaction', supported, function (t) {
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  t.plan(3 + validator.count)

  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    setTimeout(cb, 10)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
