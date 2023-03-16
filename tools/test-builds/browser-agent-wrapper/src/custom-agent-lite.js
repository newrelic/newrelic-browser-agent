import { CustomAgent } from '@newrelic/browser-agent/custom-agent'
import { Metrics } from '@newrelic/browser-agent/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/features/page_view_timing'

new CustomAgent({
  features: [
    Metrics,
    PageViewEvent,
    PageViewTiming
  ],
  loaderType: 'lite'
})
