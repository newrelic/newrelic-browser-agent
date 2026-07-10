import { RegisteredIframeEntity } from '@newrelic/browser-agent/interfaces/registered-iframe-entity'

window.RegisteredIframeEntity = RegisteredIframeEntity

// Example usage of RegisteredEntity in iframe
if (window.RegisteredIframeEntity) {
  window.entity = new window.RegisteredIframeEntity({
    id: 'iframe-test',
    name: 'iframe test',
    tags: { foo: 'bar' }
  })

  window.entity.setCustomAttribute('iframeAttribute', 'This is a custom attribute from the iframe!')

  window.entity.addPageAction('IFRAME_ACTION', { foo: 'bar' })
  window.entity.recordCustomEvent('IFRAME_CUSTOM_EVENT', { baz: 'qux' })
  window.entity.measure('IFRAME_MEASURE', { start: 0, end: 1000 })
  window.entity.log('This is a log message from the iframe!')

  fetch('/json')

  window.addEventListener('load', () => {
    // Wait for two animation frames so the browser actually commits a paint of the
    // pre-shift layout before we mutate the DOM -- without a rendered "before" frame,
    // the Layout Instability API has nothing to diff against and never reports a shift.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Insert a tall element before existing content to trigger a layout shift (CLS event)
        const spacer = document.createElement('div')
        spacer.style.height = '200px'
        document.body.insertBefore(spacer, document.body.firstChild)
      })
    })

    // Debounced so multiple clicks (e.g. to build up an INP measurement) only
    // schedule a single deregister, timed off the last click rather than the first --
    // this gives web-vitals' whenIdle enough time to finalize INP before the
    // one-shot deregister report locks in.
    let deregisterTimer = null
    document.body.addEventListener('click', () => {
      // Synchronously block the main thread for a bit so the click's Event Timing
      // entry has a measurable, non-zero duration -- a real click on this trivial
      // page finishes fast enough that INP would otherwise round down to 0.
      const blockUntil = performance.now() + 50
      while (performance.now() < blockUntil) { /* busy-wait */ }

      clearTimeout(deregisterTimer)
      deregisterTimer = setTimeout(() => {
        window.entity.deregister()
      }, 1000)
    })

    // The test performs one or more real WebDriver clicks (INP + LCP) and lets the
    // debounced handler above call deregister() once interactions have settled.
  })
  throw new Error('This is a test error from the iframe!')
}
