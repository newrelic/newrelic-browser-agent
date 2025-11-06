/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { now } from '../../common/timing/now'
import { warn } from '../../common/util/console'
import { FEATURE_NAMES } from '../features/features'
import { prefix, MEASURE } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupMeasureAPI (agent) {
  setupAPI(MEASURE, (name, options) => measure(name, options, agent), agent)
}

export function measure (name, options, agentRef, target, timestamp = now()) {
  const { start, end, customAttributes } = options || {}
  const returnObj = { customAttributes: customAttributes || {} }

  if (typeof returnObj.customAttributes !== 'object' || typeof name !== 'string' || name.length === 0) {
    warn(57)
    return
  }

  /**
     * getValueFromTiming - Helper function to extract a numeric value from a supplied option.
     * @param {Number|PerformanceMark} [timing] The timing value
     * @param {Number} [d] The default value to return if timing is invalid
     * @returns {Number} The timing value or the default value
     */
  const getValueFromTiming = (timing, d) => {
    if (timing == null) return d
    if (typeof timing === 'number') return timing
    if (timing instanceof PerformanceMark) return timing.startTime
    return Number.NaN
  }

  returnObj.start = getValueFromTiming(start, 0)
  returnObj.end = getValueFromTiming(end, timestamp)
  if (Number.isNaN(returnObj.start) || Number.isNaN(returnObj.end)) {
    warn(57)
    return
  }

  returnObj.duration = returnObj.end - returnObj.start
  if (returnObj.duration < 0) {
    warn(58)
    return
  }

  handle(prefix + MEASURE, [returnObj, name, target], undefined, FEATURE_NAMES.genericEvents, agentRef.ee)

  return returnObj
}
