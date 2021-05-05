/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var test = require('../../tools/jil/browser-test.js')
var agg = require('../../agent/aggregator')
var loader = require('loader')
var drain = require('../../agent/drain')

// api loads registers several event listeners, but does not have any exports
require('../../agent/api')

test('api', function (t) {
  t.equal(loader.customTransaction, undefined)
  newrelic.setPageViewName('bar/baz')
  drain('api')
  t.equal(loader.customTransaction, 'http://custom.transaction/bar/baz')

  setTimeout(function () {
    newrelic.finished()
    newrelic.finished()
    newrelic.finished()

    var finishedTime = 0
    var cm

    try {
      cm = agg.take(['cm']).cm
      finishedTime = cm[0].metrics.time.t
    } catch (e) {}

    t.ok(finishedTime > 0, `Set custom metric for finished time: ${finishedTime} > 0`)

    t.equal(typeof cm[1], 'undefined', 'only finish once')

    newrelic.finished()

    t.equal(agg.take(['cm']), null, 'really only finish once')

    t.end()
  }, 100)
})
