/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
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

  // timeout causes LCP to be added to the queue of timings for next harvest
  timingModule.init(mockLoader, {
    maxLCPTimeSeconds: 0.5
  })

  timingModule.init(mockLoader)

  // drain adds `timing` and `lcp` event listeners in the agent/timings module
  drain('feature')

  // simulate LCP observed
  handle('lcp', [{
    size: 123,
    startTime: 1,
    id: 'some-element-id',
    url: 'http://foo.com/a/b?c=1#2',
    element: {
      tagName: 'IMG'
    }
  }])

  setTimeout(function() {
    t.equals(timingModule.timings.length, 1, 'there should be only 2 timings (pageHide and unload)')
    t.ok(timingModule.timings[0].name === 'lcp', 'lcp should be present')

    const attributes = timingModule.timings[0].attrs
    t.equal(attributes.eid, 'some-element-id', 'eid should be present')
    t.equal(attributes.size, 123, 'size should be present')
    t.equal(attributes.url, 'http://foo.com/a/b', 'url should be present')
    t.equal(attributes.tag, 'IMG', 'element.tagName should be present')

    t.end()
  }, 1000)
})
