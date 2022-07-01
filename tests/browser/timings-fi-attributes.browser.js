/*
 * Copyright 2021 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')
const matcher = require('../../tools/jil/util/browser-matcher')

let supported = matcher.withFeature('wrappableAddEventListener')

jil.browserTest('sends expected attributes when available', supported, function(t) {
  var handle = require('handle')
  var harvest = require('../../agent/harvest')
  var timingModule = require('../../agent/timings')
  var drain = require('../../agent/drain')

  // override harvest calls, so that no network calls are made
  harvest.send = function() {
    return {}
  }

  var mockLoader = {
    info: {}
  }

  timingModule.init(mockLoader)

  // drain adds `timing` event listener in the agent/timings module
  drain('feature')

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
  handle('timing', ['fi', firstInteraction, attributes])

  t.equals(timingModule.timings.length, 1, 'there should be only 1 timing (firstInteraction)')
  t.ok(timingModule.timings[0].name === 'fi', 'fi should be present')

  const payload = timingModule.timings[0].attrs
  t.equal(payload.type, attributes.type, 'interactionType should be present')
  t.equal(payload.fid, attributes.fid, 'fid should be present')
  t.equal(payload['net-type'], attributes['net-type'], 'network type should be present')
  t.equal(payload['net-etype'], attributes['net-etype'], 'network effectiveType should be present')
  t.equal(payload['net-rtt'], attributes['net-rtt'], 'network rtt should be present')
  t.equal(payload['net-dlink'], attributes['net-dlink'], 'network downlink should be present')

  t.end()
})
