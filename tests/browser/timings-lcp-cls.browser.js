/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const jil = require('jil')


jil.browserTest('LCP event with CLS attribute', function (t) {
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

  timingModule.init(mockLoader, {})

  // drain adds `timing` and `lcp` event listeners in the agent/timings module
  drain('feature')

  handle('cls', [{ value: 1 }])
  handle('lcp', [{ size: 1, startTime: 1 }])
  handle('cls', [{ value: 2 }])

  // invoke final harvest, which includes harvesting LCP
  timingModule.finalHarvest()

  var timing = find(timingModule.timings, function(t) {
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
