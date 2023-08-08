import { onFCP } from 'web-vitals'
import { iOS_below16, initiallyHidden } from '../constants/runtime'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const fcp = new VitalMetric(VITAL_NAMES.FIRST_CONTENTFUL_PAINT)
let resolver
export const waitForFirstContentfulPaint = (buffered = true) => {
  return new Promise((resolve, reject) => {
    if (buffered && fcp.isValid) resolve(fcp)
    /* First Contentful Paint - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
    if (iOS_below16) {
      try {
        if (!initiallyHidden) { // see ios-version.js for detail on this following bug case; tldr: buffered flag doesn't work but getEntriesByType does
          const paintEntries = performance.getEntriesByType('paint')
          paintEntries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              fcp.value = Math.floor(entry.startTime)
            }
          })
          if (fcp.isValid) return resolve(fcp)
        }
      } catch (e) { reject(e) }
    } else {
      resolver = resolve
    }
  })
}

onFCP(({ value }) => {
  // set value once
  if (initiallyHidden || fcp.isValid) return
  // this.addTiming(name.toLowerCase(), value)
  fcp.value = value
  if (fcp.isValid && resolver) {
    resolver(cls)
    resolver = undefined
  }
})
