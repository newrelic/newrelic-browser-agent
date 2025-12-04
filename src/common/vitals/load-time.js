/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope, isBrowserScope, originTime, supportsNavTimingL2 } from '../constants/runtime'
import { onWindowLoad } from '../window/load'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const loadTime = new VitalMetric(VITAL_NAMES.LOAD_TIME)

if (isBrowserScope) {
  const perf = globalScope.performance
  const handler = () => {
    if (!loadTime.isValid && perf) {
      loadTime.update({
        value: supportsNavTimingL2() ? perf.getEntriesByType('navigation')?.[0]?.loadEventEnd : perf.timing?.loadEventEnd - originTime
      })
    }
  }

  onWindowLoad(handler, true)
}
