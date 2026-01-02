/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initiallyHidden, isBrowserScope } from '../constants/runtime'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const firstPaint = new VitalMetric(VITAL_NAMES.FIRST_PAINT)

if (isBrowserScope) {
  const handleEntries = (entries) => {
    entries.forEach(entry => {
      if (entry.name === 'first-paint' && !firstPaint.isValid) {
        observer.disconnect()

        /* Initial hidden state and pre-rendering not yet considered for first paint. See web-vitals onFCP for example. */
        firstPaint.update({ value: entry.startTime })
      }
    })
  }

  let observer
  try {
    if (PerformanceObserver.supportedEntryTypes.includes('paint') && !initiallyHidden) {
      observer = new PerformanceObserver((list) => {
        // Delay by a microtask to workaround a bug in Safari where the
        // callback is invoked immediately, rather than in a separate task.
        // See: https://github.com/GoogleChrome/web-vitals/issues/277
        Promise.resolve().then(() => {
          handleEntries(list.getEntries())
        })
      })
      observer.observe({ type: 'paint', buffered: true })
    }
  } catch (e) {
  // Do nothing.
  }
}
