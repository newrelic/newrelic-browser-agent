import { onCLS } from 'web-vitals'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const cumulativeLayoutShift = new VitalMetric(VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT, (x) => x)

onCLS(({ value }) => {
  if (value === cumulativeLayoutShift.value) return
  cumulativeLayoutShift.value = value
}, { reportAllChanges: true })
