import { MicroAgent } from '@newrelic/browser-agent/src/loaders/micro-agent'

window.MicroAgent = MicroAgent

var opts = {
  info: NREUM.info,
  init: NREUM.init
}
window.localStorage.clear()
// simulate agent initializations that happen around the same time
window.agent1 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 1 } })
window.agent2 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 2 } })
window.agent1.setCustomAttribute('customAttr', '1')
window.agent2.setCustomAttribute('customAttr', '2')
