import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('spa cancelled timer', supported, function (t) {
  let helpers = require('./helpers.es6')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: []
  })

  t.plan(3 + validator.count)
  t.notok(helpers.currentNodeId(), 'interaction should be null at first')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    // cancel timer1 after 5ms so that it never fires
    // do this first to avoid race conditions
    setTimeout(() => clearTimeout(timer1), 5)

    let timer1 = setTimeout(() => {
      t.fail('timer 1 should be cancelled, and should never fire')
      cb()
    }, 10)

    setTimeout(cb, 100)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
