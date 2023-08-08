import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const fp = new VitalMetric(VITAL_NAMES.FIRST_PAINT)
export const waitForFirstPaint = (buffered = true) => {
  return new Promise((resolve, reject) => {
    if (buffered && fp.isValid) return resolve(fp)
    const handleEntries = (entries) => {
      entries.forEach(entry => {
        if (entry.name === 'first-paint') {
          observer.disconnect()

          /* Initial hidden state and pre-rendering not yet considered for first paint. See web-vitals onFCP for example. */
          fp.value = entry.startTime
        }
      })
      if (fp.isValid) return resolve(fp)
    }

    let observer
    try {
      if (PerformanceObserver.supportedEntryTypes.includes('paint')) {
        observer = new PerformanceObserver((list) => {
          // Delay by a microtask to workaround a bug in Safari where the
          // callback is invoked immediately, rather than in a separate task.
          // See: https://github.com/GoogleChrome/web-vitals/issues/277
          Promise.resolve().then(() => {
            handleEntries(list.getEntries())
          })
        })
        observer.observe({ type: 'paint', buffered: true })
      }
    } catch (e) {
      // Do nothing.
    }
  })

  /* BFCache restore not yet considered for first paint. See web-vitals onFCP for example. */
}
