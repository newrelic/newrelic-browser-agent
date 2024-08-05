import { Agent } from '@newrelic/browser-agent/loaders/agent'
import { Metrics } from '@newrelic/browser-agent/features/metrics'
import { JSErrors } from '@newrelic/browser-agent/features/jserrors'
import { Ajax } from '@newrelic/browser-agent/features/ajax'
import { GenericEvents } from '@newrelic/browser-agent/features/generic_events'

export function workerAgentFactory (opts) {
  return new Agent({
    ...opts,
    features: [
      Metrics,
      JSErrors,
      Ajax,
      GenericEvents
    ],
    loaderType: 'worker'
  })
}
