/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
const { setup } = require('../utils/setup')
const { setInfo } = require('../../../packages/browser-agent-core/common/config/config')

const setupData = setup()
const {agentIdentifier, nr} = setupData

jil.browserTest('checkFinish', function (t) {
  setInfo(agentIdentifier, {})

  var clearTimeoutCalls = 0
  nr.o.CT = function() {
    clearTimeoutCalls++
  }

  var setTimeoutCalls = 0
  var executeTimeoutCallback = true
  nr.o.ST = function(cb) {
    setTimeoutCalls++
    if (executeTimeoutCallback) cb()
    return setTimeoutCalls
  }

  var { Interaction } = require('../../../packages/browser-agent-core/features/spa/aggregate/interaction')

  t.test('checkFinish sets timers', function(t) {
    var interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)
    var setTimeoutCallsStart = setTimeoutCalls

    interaction.checkFinish()

    t.ok(setTimeoutCalls === setTimeoutCallsStart + 2, 'setTimeout has been called twice')
    t.end()
  })

  t.test('checkFinish does not set timers when there is work in progress', function(t) {
    var interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)
    var setTimeoutCallsStart = setTimeoutCalls

    interaction.remaining = 1
    interaction.checkFinish()

    t.equals(setTimeoutCallsStart, setTimeoutCalls)

    t.end()
  })

  t.test('assigns url and routename to attributes', function(t) {
    var interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)

    t.ok(interaction.root.attrs.newURL === undefined, 'url is undefined initially')
    t.ok(interaction.root.attrs.newRoute === undefined, 'route name is undefined initially')

    interaction.setNewURL('some url')
    interaction.setNewRoute('some route name')

    t.ok(interaction.root.attrs.newURL === 'some url', 'url has been set')
    t.ok(interaction.root.attrs.newRoute === 'some route name', 'route name has been set')

    t.end()
  })

  t.test('does not reset finishTimer if it has already been set', function(t) {
    var setTimeoutCallsStart = setTimeoutCalls
    executeTimeoutCallback = false
    var interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)

    interaction.checkFinish()
    t.equals(setTimeoutCallsStart + 1, setTimeoutCalls, 'setTimeout has been called once')

    interaction.checkFinish()
    t.equals(setTimeoutCallsStart + 1, setTimeoutCalls, 'setTimeout has not been called again')

    executeTimeoutCallback = true
    t.end()
  })

  t.test('if timer is in progress and there is work remaining, timer should be cancelled', function(t) {
    var clearTimeoutCallsStart = clearTimeoutCalls
    executeTimeoutCallback = false
    var interaction = new Interaction(undefined, undefined, undefined, undefined, undefined, agentIdentifier)

    interaction.checkFinish()
    interaction.remaining = 1

    interaction.checkFinish()
    t.equals(clearTimeoutCallsStart + 1, clearTimeoutCalls, 'clearTimeout has been called once')

    executeTimeoutCallback = true
    t.end()
  })
})
