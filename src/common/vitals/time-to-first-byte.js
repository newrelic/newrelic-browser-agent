import { globalScope, isBrowserScope, isiOS, offset } from '../constants/runtime'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'
import { onTTFB } from 'web-vitals/attribution'

export const timeToFirstByte = new VitalMetric(VITAL_NAMES.TIME_TO_FIRST_BYTE)

if (isBrowserScope && typeof PerformanceNavigationTiming !== 'undefined' && !isiOS) {
  onTTFB(({ value, attribution }) => {
    if (timeToFirstByte.isValid) return
    timeToFirstByte.update({ value, attrs: { navigationEntry: attribution.navigationEntry } })
  })
} else {
  if (!timeToFirstByte.isValid) {
    const entry = {}
    // convert real timestamps to relative timestamps to match web-vitals behavior
    for (let key in globalScope?.performance?.timing || {}) entry[key] = Math.max(globalScope?.performance?.timing[key] - offset, 0)

    // ttfb is equiv to document's responseStart property in timing API --> https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming/responseStart
    timeToFirstByte.update({ value: entry.responseStart, attrs: { navigationEntry: entry } })
  }
}
