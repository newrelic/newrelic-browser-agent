import { RegisteredIframeEntity } from '@newrelic/browser-agent/src/interfaces/registered-iframe-entity'

window.RegisteredIframeEntity = RegisteredIframeEntity

// Example usage of RegisteredEntity in iframe
if (window.RegisteredIframeEntity) {
  window.entity = new window.RegisteredIframeEntity({
    id: 'iframe-test',
    name: 'iframe test'
  })
  console.log('RegisteredEntity created in iframe:', window.entity)
  setTimeout(() => {
    console.log('Testing API methods on RegisteredEntity in iframe...')
    window.entity.addPageAction('testAction', { foo: 'bar' })
    window.entity.noticeError(new Error('Test error from iframe'))
    window.entity.recordCustomEvent('TestEvent', { baz: 'qux' })
    window.entity.deregister()
  }, 2000)
}
