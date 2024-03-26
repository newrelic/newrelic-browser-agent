import { onINP } from 'web-vitals/attribution'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { isBrowserScope } from '../constants/runtime'

export const interactionToNextPaint = new VitalMetric(VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)

if (isBrowserScope) {
/* Interaction-to-Next-Paint */
  onINP(({ value, attribution, id }) => {
    const attrs = {
      metricId: id,
      eventTarget: attribution.eventTarget,
      eventType: attribution.eventType,
      eventTime: attribution.eventTime,
      loadState: attribution.loadState
    }
    interactionToNextPaint.update({ value, attrs })
  })
}
