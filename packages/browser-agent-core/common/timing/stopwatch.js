/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {now, getOffset} from './now'

var marks = {}

// module.exports = {
//   mark: mark,
//   measure: measure
// }

export function mark (agentId, markName, markTime) {
  if (typeof markTime === 'undefined') markTime = (now() + getOffset())
  marks[agentId] = marks[agentId] || {};
  marks[agentId][markName] = markTime
}

export function measure (aggregator, metricName, startMark, endMark) {
  const agentId = aggregator.sharedContext.agentIdentifier;
  var start = marks[agentId]?.[startMark]
  var end = marks[agentId]?.[endMark]

  if (typeof start === 'undefined' || typeof end === 'undefined') return

  aggregator.store('measures', metricName, { value: end - start })
}
