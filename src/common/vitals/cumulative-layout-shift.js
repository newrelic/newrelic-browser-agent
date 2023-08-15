import { onCLS } from 'web-vitals'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'
import { isBrowserScope } from '../constants/runtime'

export const cumulativeLayoutShift = new VitalMetric(VITAL_NAMES.CUMULATIVE_LAYOUT_SHIFT, (x) => x)

if (isBrowserScope) {
  onCLS(({ value, entries }) => {
    if (cumulativeLayoutShift.roundingMethod(value) === cumulativeLayoutShift.value.current) return
    cumulativeLayoutShift.update({ value, entries })
  }, { reportAllChanges: true })
}
