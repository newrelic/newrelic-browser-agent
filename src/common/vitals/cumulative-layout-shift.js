/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { onCLS } from 'web-vitals/attribution'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'
import { registerVital } from './register-vital'
import { isBrowserScope } from '../constants/runtime'

export const cumulativeLayoutShift = new VitalMetric(VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT, (x) => x)

if (isBrowserScope) {
  const handleCLS = ({ value, attribution, id, navigationType, navigationId, navigationInteractionId, navigationStartTime }) => {
    const attrs = {
      metricId: id,
      largestShiftTarget: attribution.largestShiftTarget,
      largestShiftTime: attribution.largestShiftTime,
      largestShiftValue: attribution.largestShiftValue,
      loadState: attribution.loadState,
      navigationType,
      navigationId,
      navigationInteractionId,
      navigationStartTime
    }
    cumulativeLayoutShift.update({ value, attrs })
  }
  // POC (soft-nav spike): reportSoftNavs resets CLS measurement at each soft navigation, same as it already does across visibility-based reports.
  registerVital(() => onCLS(handleCLS, { reportAllChanges: true, reportSoftNavs: true }))
}
