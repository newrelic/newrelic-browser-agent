import { isBrowserScope } from '../constants/runtime'
import { subscribeToEOL } from '../unload/eol'
import { VITAL_NAMES } from './constants'
import { VitalMetric } from './vital-metric'

export const longTask = new VitalMetric(VITAL_NAMES.LONG_TASK)

if (isBrowserScope) {
  const handleEntries = (entries) => {
    entries.forEach(entry => {
      longTask.update({
        value: entry.duration,
        entries,
        attrs: {
          ltFrame: entry.name, // MDN: the browsing context or frame that can be attributed to the long task
          ltStart: entry.startTime, // MDN: a double representing the time (millisec) when the task started
          ltCtr: entry.attribution[0].containerType, // MDN: type of frame container: 'iframe', 'embed', or 'object' ... but this can also be 'window',
          ...(entry.attribution[0].containerType !== 'window' && {
            ltCtrSrc: entry.attribution[0].containerSrc, // MDN: container's 'src' attribute
            ltCtrId: entry.attribution[0].containerId, // MDN: container's 'id' attribute
            ltCtrName: entry.attribution[0].containerName // MDN: container's 'name' attribute
          })
        }
      })
    })
  }

  let observer
  try {
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      observer = new PerformanceObserver((list) => {
      // Delay by a microtask to workaround a bug in Safari where the
      // callback is invoked immediately, rather than in a separate task.
      // See: https://github.com/GoogleChrome/web-vitals/issues/277
        Promise.resolve().then(() => {
          handleEntries(list.getEntries())
        })
      })
      observer.observe({ type: 'longtask', buffered: true })
    }
  } catch (e) {
  // Do nothing.
  }

  if (observer) {
    subscribeToEOL(() => {
      handleEntries(observer.takeRecords())
    }, true) // this bool is a temp arg under staged BFCache work that runs the func under the new page session logic -- tb removed w/ the feature flag later

  /* No work needed on BFCache restore for long task. */
  }
}
