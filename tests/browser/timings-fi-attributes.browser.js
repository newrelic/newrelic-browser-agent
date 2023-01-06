/*
 * Copyright 2021 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

const {setup} = require('./utils/setup')
const {drain} = require('../../src/common/drain/drain')
const {handle} = require('../../src/common/event-emitter/handle')
const {Aggregate: PvtAggregate} = require('../../src/features/page_view_timing/aggregate/index')
const {FEATURE_NAMES} = require('../../src/loaders/features/features')

const {agentIdentifier, aggregator} = setup()

jil.browserTest('sends expected attributes when available', function(t) {
  const pvtAgg = new PvtAggregate(agentIdentifier, aggregator)

  // override harvest calls, so that no network calls are made
  pvtAgg.scheduler.harvest.send = function() {
    return {}
  }

  // prevent prepareHarvest from clearing timings
  pvtAgg.prepareHarvest = function() {
    return {}
  }

  // drain adds `timing` event listener in the agent/timings module
  drain(agentIdentifier, 'feature')

  var firstInteraction = 1234

  var attributes = {
    type: 'pointerdown',
    fid: 5,
    'net-type': 'cellular',
    'net-etype': '3g',
    'net-rtt': 270,
    'net-dlink': 700
  }

  // simulate first interaction observed
  handle('timing', ['fi', firstInteraction, attributes], undefined, FEATURE_NAMES.pageViewTiming, pvtAgg.ee)

  t.equals(pvtAgg.timings.length, 1, 'there should be only 1 timing (firstInteraction)')
  t.ok(pvtAgg.timings[0].name === 'fi', 'fi should be present')

  const payload = pvtAgg.timings[0].attrs
  t.equal(payload.type, attributes.type, 'interactionType should be present')
  t.equal(payload.fid, attributes.fid, 'fid should be present')
  t.equal(payload['net-type'], attributes['net-type'], 'network type should be present')
  t.equal(payload['net-etype'], attributes['net-etype'], 'network effectiveType should be present')
  t.equal(payload['net-rtt'], attributes['net-rtt'], 'network rtt should be present')
  t.equal(payload['net-dlink'], attributes['net-dlink'], 'network downlink should be present')

  t.end()
})
