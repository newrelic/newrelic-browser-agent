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
  setupAPI(MEASURE, function (name, options) {
    const n = now()

    if (typeof name !== 'string' || name.length === 0) {
      warn(57, typeof name)
      return
    }

    const { start, end, duration, customAttributes } = options || {}
    const returnObj = { customAttributes: customAttributes || {} }

    const getStartValue = () => {
      if (typeof start === 'number') {
        return start
      } else if (start instanceof PerformanceMark) {
        return start.startTime
      } else if (typeof start === 'string') {
        const mark = performance.getEntriesByName(start, 'mark')[0]
        if (mark) {
          return mark.startTime
        }
        throw new Error(58)
      } else if (start == null) {
        return 0
      } else {
        throw new Error(58)
      }
    }

    const getEndValue = () => {
      if (typeof end === 'number') {
        return end
      } else if (end instanceof PerformanceMark) {
        return end.startTime
      } else if (typeof end === 'string') {
        const mark = performance.getEntriesByName(end, 'mark')[0]
        if (mark) {
          return mark.startTime
        }
        throw new Error(59)
      } else if (end == null) {
        return n
      } else {
        throw new Error(59)
      }
    }

    const hasStart = typeof start === 'number'
    const hasEnd = typeof end === 'number'
    try {
      if (typeof duration === 'number') {
        returnObj.duration = duration

        if (start == null && end == null) {
          returnObj.start = n - duration
          returnObj.end = n
        } else if (hasStart && !hasEnd) {
          returnObj.start = getStartValue()
          returnObj.end = start + duration
        } else if (!hasStart && hasEnd) {
          returnObj.start = end - duration
          returnObj.end = getEndValue()
        } else if (hasStart && hasEnd && end - start === duration) {
          returnObj.start = getStartValue()
          returnObj.end = getEndValue()
        } else {
          throw new Error(60)
        }
      } else {
        returnObj.start = getStartValue()
        returnObj.end = getEndValue()
        returnObj.duration = returnObj.end - returnObj.start
      }
      if (returnObj.start < 0 || returnObj.end < 0 || returnObj.duration < 0) {
        throw new Error(61)
      }
    } catch (err) {
      warn(Number.parseInt(err.message))
      return
    }

    handle(prefix + MEASURE, returnObj, undefined, FEATURE_NAMES.genericEvents, agent.ee)

    return returnObj
  }, agent)
}
