/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { onFID } from 'web-vitals/attribution'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { initiallyHidden, isBrowserScope } from '../constants/runtime'

export const firstInputDelay = new VitalMetric(VITAL_NAMES.FIRST_INPUT_DELAY)

if (isBrowserScope) {
  onFID(({ value, attribution }) => {
    if (initiallyHidden || firstInputDelay.isValid) return
    const attrs = {
      type: attribution.eventType,
      fid: Math.round(value),
      eventTarget: attribution.eventTarget,
      loadState: attribution.loadState
    }

    // CWV will only report one (THE) first-input entry to us; fid isn't reported if there are no user interactions occurs before the *first* page hiding.
    firstInputDelay.update({
      value: attribution.eventTime,
      attrs
    })
  })
}
