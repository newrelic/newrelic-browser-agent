import { onFID } from 'web-vitals'
import { VitalMetric, addConnectionAttributes } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { initiallyHidden } from '../constants/runtime'

export const fid = new VitalMetric(VITAL_NAMES.FIRST_INPUT_DELAY)
let resolver
export const waitForFirstInputDelay = (buffered = true) => {
  return new Promise((resolve, reject) => {
    if (buffered && fid.isValid) return resolve(fid)
    /* First Input Delay (+"First Interaction") - As of WV v3, it still imperfectly tries to detect document vis state asap and isn't supposed to report if page starts hidden. */
    else resolver = resolve
  })
}

onFID(({ name, value, entries }) => {
  if (initiallyHidden || fid.isValid || entries.length === 0) return

  // CWV will only report one (THE) first-input entry to us; fid isn't reported if there are no user interactions occurs before the *first* page hiding.
  fid.value = entries[0].startTime
  fid.attrs = {
    type: entries[0].name,
    fid: Math.round(value)
  }
  addConnectionAttributes(fid.attrs)
  if (fid.isValid && resolver) {
    resolver(cls)
    resolver = undefined
  }
})
