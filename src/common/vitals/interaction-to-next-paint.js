import { onINP } from 'web-vitals'
import { VitalMetric } from './vital-metric'
import { VITAL_NAMES } from './constants'

export const inp = new VitalMetric(VITAL_NAMES.INTERACTION_TO_NEXT_PAINT)
let resolver
export const waitForInteractionToNextPaint = (buffered = false) => {
  return new Promise((resolve, reject) => {
    if (buffered && inp.isValid) return resolve(inp)
    else resolver = resolve
  })
}

/* Interaction-to-Next-Paint */
onINP(({ name, value, id }) => {
  inp.value = value
  inp.attrs.metricId = id
  console.log('getting ready to report INP...', inp.isValid, !!resolver)
  if (inp.isValid && resolver) {
    resolver(cls)
    resolver = undefined
  }
})
