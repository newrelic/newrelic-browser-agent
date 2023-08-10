import { onFID } from 'web-vitals'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { initiallyHidden } from '../constants/runtime'

export const firstInputDelay = new VitalMetric(VITAL_NAMES.FIRST_INPUT_DELAY)

onFID(({ value, entries }) => {
  if (initiallyHidden || firstInputDelay.isValid || entries.length === 0) return

  // CWV will only report one (THE) first-input entry to us; fid isn't reported if there are no user interactions occurs before the *first* page hiding.
  firstInputDelay.update({
    value: entries[0].startTime,
    entries,
    attrs: { type: entries[0].name, fid: Math.round(value) },
    addConnectionAttributes: true
  })
})
