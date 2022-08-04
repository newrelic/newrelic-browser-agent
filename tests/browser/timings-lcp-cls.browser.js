/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

const {setup} = require('./utils/setup')
const {drain} = require('../../packages/browser-agent-core/common/drain/drain')
const {handle} = require('../../packages/browser-agent-core/common/event-emitter/handle')
const {Aggregate: PvtAggregate} = require('../../packages/browser-agent-core/features/page-view-timing/aggregate/index')

const {agentIdentifier, aggregator} = setup()

jil.browserTest('LCP event with CLS attribute', function (t) {
  const pvtAgg = new PvtAggregate(agentIdentifier, aggregator)

  // override harvest calls, so that no network calls are made
  pvtAgg.scheduler.harvest.send = function() {
    return {}
  }

  // prevent prepareHarvest from clearing timings
  pvtAgg.prepareHarvest = function() {
    return {}
  }

  // drain adds `timing` and `lcp` event listeners in the agent/timings module
  drain(agentIdentifier, 'feature')

  handle('cls', [{ value: 1 }], undefined, undefined, pvtAgg.ee)
  handle('lcp', [{ size: 1, startTime: 1 }], undefined, undefined, pvtAgg.ee)
  handle('cls', [{ value: 2 }], undefined, undefined, pvtAgg.ee)

  // invoke final harvest, which includes harvesting LCP
  pvtAgg.finalHarvest()

  var timing = find(pvtAgg.timings, function(t) {
    return t.name === 'lcp'
  })

  t.equal(timing.attrs.cls, 1, 'CLS value should be the one present at the time LCP happened')

  t.end()
})

function find(arr, fn) {
  if (arr.find) {
    return arr.find(fn)
  }
  var match = null
  arr.forEach(function(t) {
    if (fn(t)) {
      match = t
    }
  })
  return match
}
