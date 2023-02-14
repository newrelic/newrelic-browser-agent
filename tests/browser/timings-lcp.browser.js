/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

const { setup } = require('./utils/setup')
const { drain } = require('../../src/common/drain/drain')
const { handle } = require('../../src/common/event-emitter/handle')
const { setConfiguration } = require('../../src/common/config/state/init')
const { Aggregate: PvtAggregate } = require('../../src/features/page_view_timing/aggregate/index')
const { FEATURE_NAMES } = require('../../src/loaders/features/features')

const { agentIdentifier, aggregator } = setup()

jil.browserTest('LCP is not collected on unload when the LCP value occurs after max timeout', function (t) {
  setConfiguration(agentIdentifier, { page_view_timing: { maxLCPTimeSeconds: 0.5 } })

  const pvtAgg = new PvtAggregate(agentIdentifier, aggregator)

  // override harvest calls, so that no network calls are made
  pvtAgg.scheduler.harvest.send = function () {
    return {}
  }

  // prevent prepareHarvest from clearing timings
  pvtAgg.prepareHarvest = function () {
    return {}
  }

  // drain adds `timing` and `lcp` event listeners in the agent/timings module
  drain(agentIdentifier, 'feature')

  setTimeout(function () {
    // simulate LCP observed
    handle('lcp', [{ size: 1, startTime: 1 }], undefined, FEATURE_NAMES.pageViewTiming, pvtAgg.ee)

    // invoke final harvest, which includes harvesting LCP
    pvtAgg.recordLcp()
    pvtAgg.recordPageUnload(Date.now())

    t.equals(pvtAgg.timings.length, 2, 'there should be only 2 timings (pageHide and unload)')
    t.ok(pvtAgg.timings[1].name === 'pageHide', 'should have pageHide timing')
    t.ok(pvtAgg.timings[0].name === 'unload', 'should have unload timing')

    t.end()
  }, 1000)
})
