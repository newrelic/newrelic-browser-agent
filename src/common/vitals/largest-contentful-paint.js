/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { onLCP } from 'web-vitals/attribution'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { registerVital } from './register-vital'
import { initiallyHidden, isBrowserScope } from '../constants/runtime'
import { cleanURL } from '../url/clean-url'

export const largestContentfulPaint = new VitalMetric(VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)

if (isBrowserScope) {
  const handleLCP = ({ value, attribution, navigationType, navigationId, navigationInteractionId, navigationStartTime }) => {
  /* Largest Contentful Paint - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden.
     POC (soft-nav spike): with `reportSoftNavs` enabled, web-vitals resets LCP measurement at each soft navigation and emits a distinct metric instance
     (own .id) per route change -- so the "only once" guard below must only apply to the initial hard-nav LCP, or every soft-nav LCP after the first would
     be silently dropped. */
    const isSoftNav = navigationType === 'soft-navigation'
    if (initiallyHidden || (largestContentfulPaint.isValid && !isSoftNav)) return

    let attrs = {
      timeToFirstByte: attribution.timeToFirstByte,
      resourceLoadDelay: attribution.resourceLoadDelay,
      resourceLoadDuration: attribution.resourceLoadDuration,
      resourceLoadTime: attribution.resourceLoadDuration, // kept for NR backwards compatibility, deprecated in v3->v4
      elementRenderDelay: attribution.elementRenderDelay,
      navigationType,
      navigationId,
      navigationInteractionId,
      navigationStartTime
    }
    const lcpEntry = attribution.lcpEntry
    if (lcpEntry) {
      attrs.size = lcpEntry.size
      attrs.eid = lcpEntry.id
      if (lcpEntry.element?.tagName) attrs.elTag = lcpEntry.element.tagName
    }
    if (attribution.target) attrs.element = attribution.target // renamed from `element` in web-vitals v4->v5; NR attr name kept for backwards compatibility
    if (attribution.url) attrs.elUrl = cleanURL(attribution.url)

    largestContentfulPaint.update({ value, attrs })
  }
  registerVital(() => onLCP(handleLCP, { reportSoftNavs: true }))
}
