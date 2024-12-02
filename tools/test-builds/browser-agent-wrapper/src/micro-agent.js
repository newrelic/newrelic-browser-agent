import { MicroAgentInterface } from '@newrelic/browser-agent/src/loaders/micro-agent-interface'

// Instantiate this at the top level of your project and share the single instance across your project
const myMicroAgent = new MicroAgentInterface({
  licenseKey: 'TEST_LICENSE_KEY',
  applicationID: 'TEST_APPLICATION_ID',
  entityGuid: 'TEST_ENTITY_GUID'
})
console.log('instantiated and registered child', myMicroAgent)

// later... somewhere in your project you want to add a page action
myMicroAgent.addPageAction('test-page-action', { foo: 'bar' })
console.log('added page action')

// later... somewhere in your project you want to capture an error
myMicroAgent.noticeError(new Error('test-error'), { foo: 'bar' })
console.log('noticed error')

// later... somewhere in your project you want to log something to the log API
myMicroAgent.log('test-log', { customAttributes: { foo: 'bar' } })
console.log('logged')
