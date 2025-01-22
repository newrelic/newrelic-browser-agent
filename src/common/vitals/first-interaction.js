import { VitalMetric } from './vital-metric'
import { VITAL_NAMES, PERFORMANCE_ENTRY_TYPE } from './constants'
import { initiallyHidden, isBrowserScope } from '../constants/runtime'

// Note: First Interaction is a legacy NR timing event, not an actual CWV metric
export const firstInteraction = new VitalMetric(VITAL_NAMES.FIRST_INTERACTION)

if (isBrowserScope) {
  try {
    let observer
    // preserve the original behavior where FID is not reported if the page is hidden before the first interaction
    if (PerformanceObserver.supportedEntryTypes.includes(PERFORMANCE_ENTRY_TYPE.FIRST_INPUT) && !initiallyHidden) {
      observer = new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0]

        const attrs = {
          type: firstInput.name,
          eventTarget: firstInput.target
        }

        observer.disconnect()
        if (!firstInteraction.isValid) {
          firstInteraction.update({
            value: firstInput.startTime,
            attrs
          })
        }
      })
      observer.observe({ type: PERFORMANCE_ENTRY_TYPE.FIRST_INPUT, buffered: true })
    }
  } catch (e) {
    // Do nothing.
  }
}
