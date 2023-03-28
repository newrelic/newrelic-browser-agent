import { Agent } from '@newrelic/browser-agent/loaders/agent'
import { Metrics } from '@newrelic/browser-agent/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/features/page_view_timing'

new Agent({
  features: [
    Metrics,
    PageViewEvent,
    PageViewTiming
  ],
  loaderType: 'lite'
})
