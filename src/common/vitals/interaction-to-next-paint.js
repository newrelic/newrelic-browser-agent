import { onINP } from 'web-vitals/attribution'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'
import { isBrowserScope } from '../constants/runtime'
import { recordFirstInteraction } from './first-interaction'

export const interactionToNextPaint = new VitalMetric(VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)

if (isBrowserScope) {
/* Interaction-to-Next-Paint */
  onINP(({ value, attribution, id }) => {
    const attrs = {
      metricId: id,
      eventTarget: attribution.interactionTarget, // event* attrs deprecated in v4, kept for NR backwards compatibility
      eventTime: attribution.interactionTime, // event* attrs deprecated in v4, kept for NR backwards compatibility
      interactionTarget: attribution.interactionTarget,
      interactionTime: attribution.interactionTime,
      interactionType: attribution.interactionType,
      inputDelay: attribution.inputDelay,
      nextPaintTime: attribution.nextPaintTime,
      processingDuration: attribution.processingDuration,
      presentationDelay: attribution.presentationDelay,
      loadState: attribution.loadState
    }
    interactionToNextPaint.update({ value, attrs })

    recordFirstInteraction(attribution)
  })
}
