import { onLCP } from 'web-vitals'
import { VitalMetric, addConnectionAttributes } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { initiallyHidden } from '../constants/runtime'
import { cleanURL } from '../url/clean-url'

export const lcp = new VitalMetric(VITAL_NAMES.LARGEST_CONTENTFUL_PAINT)
let resolver
export const waitForLargestContentfulPaint = (buffered = true) => {
  return new Promise((resolve, reject) => {
    if (buffered && lcp.isValid) return resolve(lcp)
    else resolver = resolve
  })
}

onLCP(({ name, value, entries }) => {
  /* Largest Contentful Paint - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
  if (initiallyHidden || lcp.isValid) return

  lcp.value = value
  if (entries.length > 0) {
  // CWV will only ever report one (THE) lcp entry to us; lcp is also only reported *once* on earlier(user interaction, page hidden).
    const lcpEntry = entries[entries.length - 1] // this looks weird if we only expect one, but this is how cwv-attribution gets it so to be sure...
    lcp.attrs = {
      size: lcpEntry.size,
      eid: lcpEntry.id,
      ...(!!lcpEntry.url && { elUrl: cleanURL(lcpEntry.url) }),
      ...(!!lcpEntry.element?.tagName && { elTag: lcpEntry.element.tagName })
    }
  }

  addConnectionAttributes(lcp.attrs)
  if (lcp.isValid && resolver) {
    resolver(cls)
    resolver = undefined
  }
})
