/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
const { setup } = require('../utils/setup')

const setupData = setup()
const { baseEE, agentIdentifier, aggregator } = setupData

jil.browserTest('spa buffers all expected events', function (t) {
  var { registerHandler } = require('../../../src/common/event-emitter/register-handler.js')
  var { drain } = require('../../../src/common/drain/drain')

  var plan = 0

  const { Instrument } = require('../../../src/features/spa/instrument/index')
  const spaIns = new Instrument(agentIdentifier, aggregator, false)

  var events = {
    base: ['fn-start', 'fn-end', 'xhr-resolved'],
    events: ['fn-start'],
    timer: ['setTimeout-end', 'clearTimeout-start', 'fn-start'],
    xhr: ['fn-start', 'new-xhr', 'send-xhr-start'],
    fetch: ['fetch-start', 'fetch-done'],
    history: ['newURL'],
    mutation: ['fn-start'],
    promise: ['propagate', 'cb-start', 'cb-end', 'executor-err', 'resolve-start'],
    tracer: ['fn-start', 'no-fn-start'],
  }

  Object.keys(events).forEach((key) => {
    var eventNames = events[key]
    var emitter = key === 'base' ? baseEE : baseEE.get(key)

    eventNames.forEach((evName) => {
      plan += 3
      var args = [
        {
          addEventListener: () => null,
          1: () => null,
        },
        {
          addEventListener: () => null,
          clone: () => {
            return {
              arrayBuffer: () => {
                return {
                  then: () => null,
                }
              },
            }
          },
        },
        {
          then: () => null,
        },
      ]
      var ctx = baseEE.context()
      emitter.emit(evName, args, ctx)
      registerHandler(
        evName,
        function (a, b) {
          // filter out non test events
          if (this !== ctx) return
          t.equal(a, args[0])
          t.equal(b, args[1])
          t.equal(this, ctx)
        },
        'spa',
        emitter
      )
    })
  })

  t.plan(plan)

  setTimeout(() => drain(agentIdentifier, 'spa'))
})
