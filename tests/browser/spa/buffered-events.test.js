/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
const matcher = require('../../../tools/jil/util/browser-matcher')

let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('spa buffers all expected events', supported, function (t) {
  var baseEE = require('ee')
  var register = require('../../../agent/register-handler.js')
  var drain = require('../../../agent/drain')

  var plan = 0

  require('loader')
  require('../../../feature/spa/instrument/index.js')

  var events = {
    'base': ['fn-start', 'fn-end', 'xhr-done', 'xhr-resolved'],
    'events': ['fn-start'],
    'timer': ['setTimeout-end', 'clearTimeout-start', 'fn-start'],
    'xhr': ['fn-start', 'new-xhr', 'send-xhr-start'],
    'fetch': ['fetch-start', 'fetch-done'],
    'history': ['newURL'],
    'mutation': ['fn-start'],
    'promise': ['propagate', 'cb-start', 'cb-end', 'executor-err', 'resolve-start'],
    'tracer': ['fn-start', 'no-fn-start']
  }

  Object.keys(events).forEach((key) => {
    var eventNames = events[key]
    var emitter = key === 'base' ? baseEE : baseEE.get(key)

    eventNames.forEach((evName) => {
      plan += 3
      var args = [{
        addEventListener: () => null,
        1: () => null
      }, {
        addEventListener: () => null,
        clone: () => {
          return {
            arrayBuffer: () => {
              return {
                then: () => null
              }
            }
          }
        }
      }, {
        then: () => null
      }]
      var ctx = baseEE.context()
      emitter.emit(evName, args, ctx)
      register.on(emitter, evName, function (a, b) {
        // filter out non test events
        if (this !== ctx) return
        t.equal(a, args[0])
        t.equal(b, args[1])
        t.equal(this, ctx)
      })
    })
  })

  t.plan(plan)

  setTimeout(() => drain('feature'))
})
