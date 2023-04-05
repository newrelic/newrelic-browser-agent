import { BrowserAgent } from '@newrelic/browser-agent/src/loaders/browser-agent'

const opts = {
  info: NREUM.info,
  init: NREUM.init
}

new BrowserAgent(opts)
