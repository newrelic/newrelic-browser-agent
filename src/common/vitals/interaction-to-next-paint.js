/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { onINP } from 'web-vitals/attribution'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { registerVital } from './register-vital'
import { isBrowserScope } from '../constants/runtime'

export const interactionToNextPaint = new VitalMetric(VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)

if (isBrowserScope) {
  /* Interaction-to-Next-Paint */
  const handleINP = ({ value, attribution, id, entries }) => {
    /* web-vitals v6 reports a synthetic INP (value 8, no entries, no interaction attribution) after bfcache restores when
      every interaction stayed below the duration threshold; skip those so only measured interactions are reported, as in v4 */
    if (!entries?.length) return
    const attrs = {
      metricId: id,
      eventTarget: attribution.interactionTarget, // event* attrs deprecated in v4, kept for NR backwards compatibility
      eventTime: attribution.interactionTime, // event* attrs deprecated in v4, kept for NR backwards compatibility
      interactionTarget: attribution.interactionTarget,
      interactionTime: attribution.interactionTime,
      interactionType: attribution.interactionType,
      inputDelay: attribution.inputDelay,
      nextPaintTime: attribution.nextPaintTime,
      processingDuration: attribution.processingDuration,
      presentationDelay: attribution.presentationDelay,
      loadState: attribution.loadState
    }
    interactionToNextPaint.update({ value, attrs })
  }
  registerVital(() => onINP(handleINP))
}
