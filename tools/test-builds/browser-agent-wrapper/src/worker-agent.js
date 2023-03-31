import { WorkerAgent } from '@newrelic/browser-agent/loaders/worker-agent'

const opts = {
  info: NREUM.info,
  init: NREUM.init
}

new WorkerAgent(opts)
