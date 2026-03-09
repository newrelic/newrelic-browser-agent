/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope, isBrowserScope, originTime, getNavigationEntry } from '../constants/runtime'
import { onWindowLoad } from '../window/load'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const loadTime = new VitalMetric(VITAL_NAMES.LOAD_TIME)

if (isBrowserScope) {
  const perf = globalScope.performance
  const handler = () => {
    if (!loadTime.isValid && perf) {
      const navEntry = getNavigationEntry()
      loadTime.update({
        value: navEntry ? navEntry.loadEventEnd : (perf.timing?.loadEventEnd - originTime)
      })
    }
  }

  onWindowLoad(handler, true)
}
