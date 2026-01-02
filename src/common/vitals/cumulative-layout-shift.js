/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { onCLS } from 'web-vitals/attribution'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'
import { isBrowserScope } from '../constants/runtime'

export const cumulativeLayoutShift = new VitalMetric(VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT, (x) => x)

if (isBrowserScope) {
  onCLS(({ value, attribution, id }) => {
    const attrs = {
      metricId: id,
      largestShiftTarget: attribution.largestShiftTarget,
      largestShiftTime: attribution.largestShiftTime,
      largestShiftValue: attribution.largestShiftValue,
      loadState: attribution.loadState
    }
    cumulativeLayoutShift.update({ value, attrs })
  }, { reportAllChanges: true })
}
