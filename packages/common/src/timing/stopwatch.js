/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { store } from '../aggregate/aggregator'
import {now, offset} from './now'

var marks = {}

// module.exports = {
//   mark: mark,
//   measure: measure
// }

export function mark (markName, markTime) {
  if (typeof markTime === 'undefined') markTime = (now() + offset)
  marks[markName] = markTime
}

export function measure (metricName, startMark, endMark) {
  var start = marks[startMark]
  var end = marks[endMark]

  if (typeof start === 'undefined' || typeof end === 'undefined') return

  store('measures', metricName, { value: end - start })
}
