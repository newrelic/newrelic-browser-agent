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

    const { start, end, customAttributes } = options || {}
    const returnObj = { customAttributes: customAttributes || {} }

    const getValueFromTiming = (timing, d) => {
      if (timing == null) return d
      if (typeof timing === 'number') return timing
      if (timing instanceof PerformanceMark) return timing.startTime
      throw new Error(57)
    }

    try {
      returnObj.start = getValueFromTiming(start, 0)
      returnObj.end = getValueFromTiming(end, n)
      returnObj.duration = returnObj.end - returnObj.start
      if (returnObj.duration < 0) throw new Error(58)
    } catch (err) {
      warn(Number.parseInt(err.message))
      return
    }

    handle(prefix + MEASURE, [returnObj, name], undefined, FEATURE_NAMES.genericEvents, agent.ee)

    return returnObj
  }, agent)
}
