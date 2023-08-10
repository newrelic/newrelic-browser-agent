import { onLCP } from 'web-vitals'
import { VitalMetric, addConnectionAttributes } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { initiallyHidden } from '../constants/runtime'
import { cleanURL } from '../url/clean-url'

export const largestContentfulPaint = new VitalMetric(VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)

onLCP(({ value, entries }) => {
  /* Largest Contentful Paint - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
  if (initiallyHidden || largestContentfulPaint.isValid) return

  const lcpEntry = entries[entries.length - 1] // this looks weird if we only expect one, but this is how cwv-attribution gets it so to be sure...
  largestContentfulPaint.update({
    value,
    entries,
    ...(entries.length > 0 && {
      attrs: {
        size: lcpEntry.size,
        eid: lcpEntry.id,
        ...(!!lcpEntry.url && { elUrl: cleanURL(lcpEntry.url) }),
        ...(!!lcpEntry.element?.tagName && { elTag: lcpEntry.element.tagName })
      }
    }),
    addConnectionAttributes: true
  })
})
