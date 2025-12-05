import { MicroAgent } from '@newrelic/browser-agent/loaders/micro-agent'

var opts = {
  info: NREUM.info,
  init: NREUM.init
}
window.agent1 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 1 } })
window.agent2 = new MicroAgent({ ...opts, info: { ...opts.info, applicationID: 2 } })

// each payload in this test is decorated with data that matches its appId for ease of testing
window.agent1.setCustomAttribute('customAttr', '1')
window.agent2.setCustomAttribute('customAttr', '2')

// each payload in this test is decorated with data that matches its appId for ease of testing
window.agent1.noticeError('1')
window.agent2.noticeError('2')

// each payload in this test is decorated with data that matches its appId for ease of testing
window.agent1.addPageAction('1', { val: 1 })
window.agent2.addPageAction('2', { val: 2 })

// each payload in this test is decorated with data that matches its appId for ease of testing
window.agent1.log('1')
window.agent2.log('2')
