import { Agent } from '@newrelic/browser-agent/src/loaders/agent'
import { Metrics } from '@newrelic/browser-agent/src/features/metrics'
import { JSErrors } from '@newrelic/browser-agent/src/features/jserrors'
import { Ajax } from '@newrelic/browser-agent/src/features/ajax'
import { PageAction } from '@newrelic/browser-agent/src/features/page_action'

export function workerAgentFactory (opts) {
  return new Agent({
    ...opts,
    features: [
      Metrics,
      JSErrors,
      Ajax,
      PageAction
    ],
    loaderType: 'worker'
  })
}
