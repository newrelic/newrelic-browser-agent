import { MicroAgent } from '@newrelic/browser-agent/src/loaders/micro-agent'

const opts = {
  info: NREUM.info,
  init: NREUM.init
}

new MicroAgent(opts)
