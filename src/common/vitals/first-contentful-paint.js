/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { onFCP } from 'web-vitals/attribution'
// eslint-disable-next-line camelcase
import { iOSBelow16, initiallyHidden, isBrowserScope } from '../constants/runtime'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const firstContentfulPaint = new VitalMetric(VITAL_NAMES.FIRST_CONTENTFUL_PAINT)

/* First Contentful Paint - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
if (isBrowserScope) {
  // eslint-disable-next-line camelcase
  if (iOSBelow16) {
    try {
      if (!initiallyHidden) { // see ios-version.js for detail on this following bug case; tldr: buffered flag doesn't work but getEntriesByType does
        const paintEntries = performance.getEntriesByType('paint')
        paintEntries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            firstContentfulPaint.update({ value: Math.floor(entry.startTime) })
          }
        })
      }
    } catch (e) {
    // ignore
    }
  } else {
    onFCP(({ value, attribution }) => {
      if (initiallyHidden || firstContentfulPaint.isValid) return
      const attrs = {
        timeToFirstByte: attribution.timeToFirstByte,
        firstByteToFCP: attribution.firstByteToFCP,
        loadState: attribution.loadState
      }
      firstContentfulPaint.update({ value, attrs })
    })
  }
}
