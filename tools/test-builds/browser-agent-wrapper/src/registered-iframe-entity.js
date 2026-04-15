import { RegisteredIframeEntity } from '@newrelic/browser-agent/interfaces/registered-iframe-entity'

window.RegisteredIframeEntity = RegisteredIframeEntity

// Example usage of RegisteredEntity in iframe
if (window.RegisteredIframeEntity) {
  window.entity = new window.RegisteredIframeEntity({
    id: 'iframe-test',
    name: 'iframe test'
  })
  console.log('RegisteredEntity created in iframe:', window.entity)
}
