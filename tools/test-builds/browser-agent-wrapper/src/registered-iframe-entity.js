import { RegisteredIframeEntity } from '@newrelic/browser-agent/interfaces/registered-iframe-entity'

window.RegisteredIframeEntity = RegisteredIframeEntity

// Example usage of RegisteredEntity in iframe
if (window.RegisteredIframeEntity) {
  window.entity = new window.RegisteredIframeEntity({
    id: 'iframe-test',
    name: 'iframe test'
  })

  window.entity.setCustomAttribute('iframeAttribute', 'This is a custom attribute from the iframe!')

  window.entity.addPageAction('IFRAME_ACTION', { foo: 'bar' })
  window.entity.recordCustomEvent('IFRAME_CUSTOM_EVENT', { baz: 'qux' })
  window.entity.measure('IFRAME_MEASURE', { start: 0, end: 1000 })
  window.entity.log('This is a log message from the iframe!')

  fetch('/json')

  window.addEventListener('DOMContentLoaded', () => {
    // Insert a tall element before existing content to trigger a layout shift (CLS event)
    const spacer = document.createElement('div')
    spacer.style.height = '200px'
    document.body.insertBefore(spacer, document.body.firstChild)

    document.body.addEventListener('click', () => {
      const spacer = document.createElement('div')
      spacer.style.height = '200px'
      document.body.insertBefore(spacer, document.body.firstChild)
    })

    // User interaction finalizes both CLS and LCP reporting via web-vitals callbacks
    document.querySelector('body').click()

    setTimeout(() => {
      window.entity.deregister()
    }, 3000)
  })
  throw new Error('This is a test error from the iframe!')
}
