import { RegisteredEntity } from '@newrelic/browser-agent/interfaces/registered-entity'

window.RegisteredEntity = RegisteredEntity

window.agent1 = new RegisteredEntity({
  licenseKey: window.NREUM.info.licenseKey,
  applicationID: 1
})

window.addEventListener('load', () => {
  import('./test.js').then(({ default: test }) => {
    test()
  })
})
