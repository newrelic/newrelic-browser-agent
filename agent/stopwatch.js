/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var aggregator = require('./aggregator')
var now = require('now')

var marks = {}

module.exports = {
  mark: mark,
  measure: measure
}

function mark (markName, markTime) {
  if (typeof markTime === 'undefined') markTime = (now() + now.offset)
  marks[markName] = markTime
}

function measure (metricName, startMark, endMark) {
  var start = marks[startMark]
  var end = marks[endMark]

  if (typeof start === 'undefined' || typeof end === 'undefined') return

  aggregator.store('measures', metricName, { value: end - start })
}
