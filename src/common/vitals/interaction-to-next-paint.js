import { onINP } from 'web-vitals'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'

export const interactionToNextPaint = new VitalMetric(VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)

/* Interaction-to-Next-Paint */
onINP(({ value, entries, id }) => {
  interactionToNextPaint.update({ value, entries, attrs: { metricId: id } })
})