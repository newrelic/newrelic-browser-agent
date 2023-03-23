/**
 * Calls the `onReport` function when the 'first-paint' PerformancePaintTiming entry is observed.
 * The argument supplied is an object similar to the Metric type used by web-vitals library.
 *
 * @param {Function} onReport - callback that accepts a `metric` object as the single parameter
 */
export const onFirstPaint = (onReport) => {
  const handleEntries = (entries) => {
    entries.forEach(entry => {
      if (entry.name === 'first-paint') {
        observer.disconnect()

        /* Initial hidden state and pre-rendering not yet considered for first paint. See web-vitals onFCP for example. */
        const metric = {
          name: 'FP',
          value: entry.startTime
        }
        onReport(metric)
      }
    })
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

  /* BFCache restore not yet considered for first paint. See web-vitals onFCP for example. */
}
