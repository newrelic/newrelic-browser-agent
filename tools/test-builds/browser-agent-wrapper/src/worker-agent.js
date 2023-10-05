import { Agent } from '@newrelic/browser-agent/loaders/agent'
import { Metrics } from '@newrelic/browser-agent/features/metrics'
import { JSErrors } from '@newrelic/browser-agent/features/jserrors'
import { Ajax } from '@newrelic/browser-agent/features/ajax'
import { PageAction } from '@newrelic/browser-agent/features/page_action'

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
