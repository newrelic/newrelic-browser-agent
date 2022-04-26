/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { store } from '../aggregate/aggregator'
import { log } from '../debug/logging'
import {now, getOffset} from './now'

var marks = {}

// module.exports = {
//   mark: mark,
//   measure: measure
// }

export function mark (markName, markTime) {
  if (typeof markTime === 'undefined') markTime = (now() + getOffset())
  marks[markName] = markTime
}

export function measure (metricName, startMark, endMark) {
  log('measure', metricName, startMark, endMark)
  var start = marks[startMark]
  var end = marks[endMark]

  log('marks...', marks, start, end)

  if (typeof start === 'undefined' || typeof end === 'undefined') return

  log('... store the measure ...')
  store('measures', metricName, { value: end - start })
}
