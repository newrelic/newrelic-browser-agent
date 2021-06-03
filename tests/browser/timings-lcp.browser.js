/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
const matcher = require('../../tools/jil/util/browser-matcher')

let supported = matcher.withFeature('wrappableAddEventListener')

var handle = require('handle')
var harvest = require('../../agent/harvest')
var timingModule = require('../../agent/timings')
var drain = require('../../agent/drain')

jil.browserTest('LCP is not collected on unload when the LCP value occurs after max timeout', supported, function (t) {
  // override harvest calls, so that no network calls are made
  harvest.send = function() {
    return {}
  }

  var mockLoader = {
    info: {}
  }

  timingModule.init(mockLoader, {
    maxLCPTimeSeconds: 0.5
  })

  // drain adds `timing` and `lcp` event listeners in the agent/timings module
  drain('feature')

  setTimeout(function() {
    // simulate LCP observed
    handle('lcp', [{ size: 1, startTime: 1 }])

    // invoke final harvest, which includes harvesting LCP
    timingModule.finalHarvest()

    t.equals(timingModule.timings.length, 2, 'there should be only pageHide and unload timings')
    t.ok(!!timingModule.timings.find(x => x.name === 'pageHide'), 'should have pageHide timing')
    t.ok(!!timingModule.timings.find(x => x.name === 'unload'), 'should have unload timing')
    t.notEquals(timingModule.timings[0].name, 'lcp')

    t.end()
  }, 1000)
})
