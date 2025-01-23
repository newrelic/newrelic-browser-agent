/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { onLCP } from 'web-vitals/attribution'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { initiallyHidden, isBrowserScope } from '../constants/runtime'
import { cleanURL } from '../url/clean-url'

export const largestContentfulPaint = new VitalMetric(VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)

if (isBrowserScope) {
  onLCP(({ value, attribution }) => {
  /* Largest Contentful Paint - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
    if (initiallyHidden || largestContentfulPaint.isValid) return

    let attrs
    const lcpEntry = attribution.lcpEntry
    if (lcpEntry) {
      attrs = {
        size: lcpEntry.size,
        eid: lcpEntry.id,
        element: attribution.element,
        timeToFirstByte: attribution.timeToFirstByte,
        resourceLoadDelay: attribution.resourceLoadDelay,
        resourceLoadDuration: attribution.resourceLoadDuration,
        resourceLoadTime: attribution.resourceLoadDuration, // kept for NR backwards compatibility, deprecated in v3->v4
        elementRenderDelay: attribution.elementRenderDelay
      }
      if (attribution.url) attrs.elUrl = cleanURL(attribution.url)
      if (lcpEntry.element?.tagName) attrs.elTag = lcpEntry.element.tagName
    }

    largestContentfulPaint.update({ value, attrs })
  })
}
