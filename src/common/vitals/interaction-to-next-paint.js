/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { onINP } from 'web-vitals/attribution'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { initiallyHidden, isBrowserScope } from '../constants/runtime'

export const interactionToNextPaint = new VitalMetric(VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)
// Note: First Interaction is a legacy NR timing event, not an actual CWV metric
// ('fi' used to be detected via FID.  It is now represented by the first INP)
export const firstInteraction = new VitalMetric(VITAL_NAMES.FIRST_INTERACTION)

if (isBrowserScope) {
  const recordFirstInteraction = (attribution) => {
    firstInteraction.update({
      value: attribution.interactionTime,
      attrs: {
        type: attribution.interactionType,
        eventTarget: attribution.interactionTarget,
        loadState: attribution.loadState
      }
    })
  }

  /* Interaction-to-Next-Paint */
  onINP(({ value, attribution, id }) => {
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

    // preserve the original behavior where FID is not reported if the page is hidden before the first interaction
    if (!firstInteraction.isValid && !initiallyHidden) {
      recordFirstInteraction(attribution)
    }
  })
}
