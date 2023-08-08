import { onCLS } from 'web-vitals'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const cls = new VitalMetric(VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT, undefined, (x) => x)
let resolver
export const waitForCumulativeLayoutShift = (buffered = false) => {
  return new Promise((resolve, reject) => {
    /* Cumulative Layout Shift - We don't have to limit this callback since cls is stored as a state and only sent as attribute on other timings.
      reportAllChanges ensures our tracked cls has the most recent rolling value to attach to 'unload' and 'pagehide'. */
    if (buffered && cls.isValid) resolve(cls)
    else resolver = resolve
  })
}

onCLS(({ value }) => {
  if (value === cls.value) return
  cls.value = value
  if (resolver) {
    resolver(cls)
    resolver = undefined
  }
}, { reportAllChanges: true })
