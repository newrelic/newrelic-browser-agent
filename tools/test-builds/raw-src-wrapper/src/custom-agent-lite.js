import { Agent } from '@newrelic/browser-agent/src/loaders/agent'
import { Metrics } from '@newrelic/browser-agent/src/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/src/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/src/features/page_view_timing'

new Agent({
  features: [
    Metrics,
    PageViewEvent,
    PageViewTiming
  ],
  loaderType: 'lite'
})
