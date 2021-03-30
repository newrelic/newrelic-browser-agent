import jil from 'jil'
let matcher = require('../../../tools/jil/util/browser-matcher')
let supported = matcher.withFeature('wrappableAddEventListener')

let loaded = false
let loadQueue = []

if (global.addEventListener) {
  global.addEventListener('load', function () {
    loaded = true
    for (var i = 0; i < loadQueue.length; ++i) {
      loadQueue[i]()
    }
  })
}

function onWindowLoad (cb) {
  if (loaded) {
    cb()
  } else {
    loadQueue.push(cb)
  }
}

jil.browserTest('sync event in timer', supported, function (t) {
  let helpers = require('./helpers.es6')
  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    children: [{
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: [{
        name: 'ajax',
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: [{
            type: 'customTracer',
            attrs: {
              name: 'timer'
            },
            children: []
          }]
        }]
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

  onWindowLoad(function () {
    helpers.startInteraction(onInteractionStart, afterInteractionDone)
  })

  function onInteractionStart (cb) {
    setTimeout(newrelic.interaction().createTracer('timer', () => {
      var first = true
      var xhr = new XMLHttpRequest()

      xhr.onreadystatechange = function () {
        if (!first) return
        first = false
        setTimeout(newrelic.interaction().createTracer('timer', function () {
          setTimeout(newrelic.interaction().createTracer('timer', cb))
        }))
      }

      xhr.open('GET', '/')
      xhr.send()
      setTimeout(newrelic.interaction().createTracer('timer', function () {}))
    }), 0)
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('sync event in click', supported, function (t) {
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
        children: [{
          type: 'customTracer',
          attrs: {
            name: 'timer'
          },
          children: []
        }]
      }]
    }, {
      type: 'customTracer',
      attrs: {
        name: 'timer'
      },
      children: []
    }]
  })

  t.plan(2 + validator.count)

  onWindowLoad(function () {
    helpers.startInteraction(onInteractionStart, afterInteractionDone)
  })

  function onInteractionStart (cb) {
    var first = true
    var xhr = new XMLHttpRequest()

    xhr.onreadystatechange = function () {
      if (!first) return
      first = false
      setTimeout(newrelic.interaction().createTracer('timer', function () {
        setTimeout(newrelic.interaction().createTracer('timer', cb))
      }))
    }

    xhr.open('GET', '/')
    xhr.send()
    setTimeout(newrelic.interaction().createTracer('timer', function () {}))
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
