/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
const matcher = require('../../../tools/jil/util/browser-matcher')

let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('setCurrentRouteName', supported, function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {
      oldRoute: 'test start',
      newRoute: 'in test interaction'
    },
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.setCurrentRouteName('test start')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.setCurrentRouteName('in test interaction')
    cb()
  }

  function afterInteractionDone (interaction) {
    t.notOk(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('interaction is not a route change if it does not change the url while route name is null', supported, function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  t.plan(3 + validator.count)
  newrelic.setCurrentRouteName(null)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    cb()
  }

  function afterInteractionDone (interaction) {
    t.notOk(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('interaction is not a route change if it does not change url or route', supported, function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  t.plan(3 + validator.count)
  newrelic.setCurrentRouteName('test start')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    cb()
  }

  function afterInteractionDone (interaction) {
    t.notOk(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('url change is a route change when route name is set', supported, function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.setCurrentRouteName('test start')
  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    window.location.hash = Math.random()
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('replaceState is a route change when route name is set', supported, function (t) {
  let helpers = require('./helpers')

  if (!window.history.replaceState) {
    t.skip('does not have replaceState')
    t.end()
    return
  }

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.setCurrentRouteName('test start')
  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    var prevLocation = window.location.pathname + window.location.search + window.location.hash
    window.history.replaceState(null, 'test', '/something-else')
    window.history.replaceState(null, 'test', prevLocation)
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('setting route to null does not count as a route change', supported, function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.setCurrentRouteName('test start')
  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.setCurrentRouteName(null)
    cb()
  }

  function afterInteractionDone (interaction) {
    t.notOk(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('changing the url when route name is null counts as a route change', supported, function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.setCurrentRouteName('test start')
  newrelic.setCurrentRouteName(null)

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    window.location.hash = Math.random()
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('resetting the route to the same routename does not count as a route change', supported, function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.setCurrentRouteName('test start')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.setCurrentRouteName('test start')
    cb()
  }

  function afterInteractionDone (interaction) {
    t.notOk(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('changeing route, and changing back to original is not a route change', supported, function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.setCurrentRouteName('original')

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    newrelic.setCurrentRouteName('new')
    newrelic.setCurrentRouteName('original')
    cb()
  }

  function afterInteractionDone (interaction) {
    t.notOk(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})

jil.browserTest('changeing url, and changing back to original is a route change', supported, function (t) {
  let helpers = require('./helpers')

  let validator = new helpers.InteractionValidator({
    name: 'interaction',
    attrs: {},
    children: []
  })

  t.plan(3 + validator.count)

  newrelic.setCurrentRouteName(null)
  window.location.hash = 'original'

  helpers.startInteraction(onInteractionStart, afterInteractionDone)

  function onInteractionStart (cb) {
    window.location.hash = 'new'
    setTimeout(function () {
      window.location.hash = 'original'
    })
    cb()
  }

  function afterInteractionDone (interaction) {
    t.ok(interaction.routeChange)
    t.ok(interaction.root.end, 'interaction should be finished and have an end time')
    t.notok(helpers.currentNodeId(), 'interaction should be null outside of async chain')
    validator.validate(t, interaction)
    t.end()
  }
})
