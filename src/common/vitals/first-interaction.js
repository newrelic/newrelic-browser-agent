/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { initiallyHidden, isBrowserScope } from '../constants/runtime'

// Note: First Interaction is a legacy NR timing event, not an actual CWV metric
// ('fi' used to be detected via FID.  It is now represented by the first INP)
export const firstInteraction = new VitalMetric(VITAL_NAMES.FIRST_INTERACTION)

export function recordFirstInteraction (attribution) {
  if (isBrowserScope) {
    // preserve the original behavior where FID is not reported if the page is hidden before the first interaction
    if (initiallyHidden || firstInteraction.isValid) return
    const attrs = {
      type: attribution.interactionType,
      eventTarget: attribution.interactionTarget,
      loadState: attribution.loadState
    }

    firstInteraction.update({
      value: attribution.interactionTime,
      attrs
    })
  }
}
