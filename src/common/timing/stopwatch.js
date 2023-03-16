/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getRuntime } from '../config/config'
import { now } from './now'

var marks = {}

export function mark (agentId, markName, markTime) {
  if (typeof markTime === 'undefined') markTime = (now() + getRuntime(agentId).offset)
  marks[agentId] = marks[agentId] || {}
  marks[agentId][markName] = markTime
}

export function measure (aggregator, metricName, startMark, endMark) {
  const agentId = aggregator.sharedContext.agentIdentifier
  var start = marks[agentId]?.[startMark]
  var end = marks[agentId]?.[endMark]

  if (typeof start === 'undefined' || typeof end === 'undefined') return

  aggregator.store('measures', metricName, { value: end - start })
}
