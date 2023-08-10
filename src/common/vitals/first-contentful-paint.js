import { onFCP } from 'web-vitals'
import { iOS_below16, initiallyHidden } from '../constants/runtime'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const firstContentfulPaint = new VitalMetric(VITAL_NAMES.FIRST_CONTENTFUL_PAINT)

/* First Contentful Paint - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
if (iOS_below16) {
  try {
    if (!initiallyHidden) { // see ios-version.js for detail on this following bug case; tldr: buffered flag doesn't work but getEntriesByType does
      const paintEntries = performance.getEntriesByType('paint')
      paintEntries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          firstContentfulPaint.value = Math.floor(entry.startTime)
        }
      })
    }
  } catch (e) {
    // ignore
  }
} else {
  onFCP(({ value, entries }) => {
    if (initiallyHidden || firstContentfulPaint.isValid) return
    firstContentfulPaint.update({ value, entries })
  })
}
