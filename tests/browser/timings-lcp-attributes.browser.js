/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')

const {setup} = require('./utils/setup')
const {drain} = require('../../dist/packages/browser-agent-core/src/common/drain/drain')
const {handle} = require('../../dist/packages/browser-agent-core/src/common/event-emitter/handle')
const {setConfiguration} = require("../../dist/packages/browser-agent-core/src/common/config/state/init")
const {Aggregate: PvtAggregate} = require('../../dist/packages/browser-agent-core/src/features/page-view-timing/aggregate/index')

const {agentIdentifier, aggregator} = setup()

jil.browserTest('sends expected attributes when available', function(t) {
  // timeout causes LCP to be added to the queue of timings for next harvest
  setConfiguration(agentIdentifier, { page_view_timing: {maxLCPTimeSeconds: 0.5} })

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

  var lcpEntry = {
    size: 123,
    startTime: 1,
    id: 'some-element-id',
    url: 'http://foo.com/a/b?c=1#2',
    element: {
      tagName: 'IMG'
    }
  }

  var networkInfo = {
    'net-type': 'cellular',
    'net-etype': '3g',
    'net-rtt': '270',
    'net-dlink': '700'
  }

  // simulate LCP observed
  handle('lcp', [lcpEntry, networkInfo], undefined, undefined, pvtAgg.ee)

  setTimeout(function() {
    t.equals(pvtAgg.timings.length, 1, 'there should be only 2 timings (pageHide and unload)')
    t.ok(pvtAgg.timings[0].name === 'lcp', 'lcp should be present')

    const attributes = pvtAgg.timings[0].attrs
    t.equal(attributes.eid, 'some-element-id', 'eid should be present')
    t.equal(attributes.size, 123, 'size should be present')
    t.equal(attributes.elUrl, 'http://foo.com/a/b', 'url should be present')
    t.equal(attributes.elTag, 'IMG', 'element.tagName should be present')
    t.equal(attributes['net-type'], networkInfo['net-type'], 'network type should be present')
    t.equal(attributes['net-etype'], networkInfo['net-etype'], 'network effectiveType should be present')
    t.equal(attributes['net-rtt'], networkInfo['net-rtt'], 'network rtt should be present')
    t.equal(attributes['net-dlink'], networkInfo['net-dlink'], 'network downlink should be present')

    t.end()
  }, 1000)
})
