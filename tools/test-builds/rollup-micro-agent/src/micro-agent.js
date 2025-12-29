import { MicroAgent } from '@newrelic/browser-agent/loaders/micro-agent'

var opts = {
  info: NREUM.info,
  init: NREUM.init
}
window.localStorage.clear()
window.agent1 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 1 } })
window.agent1.setCustomAttribute('customAttr', '1')

// wait 1 second to simulate staggered agent initialization
setTimeout(() => {
  window.agent2 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 2 } })
  window.agent2.setCustomAttribute('customAttr', '2')
}, 1000)
