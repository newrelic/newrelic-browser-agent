import { BrowserAgent } from '@newrelic/browser-agent/browser-agent'

const opts = {
  info: NREUM.info,
  init: NREUM.init
}

new BrowserAgent(opts)
