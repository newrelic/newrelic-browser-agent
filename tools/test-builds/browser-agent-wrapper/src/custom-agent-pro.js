import { Agent } from '@newrelic/browser-agent/loaders/agent'
import { Ajax } from '@newrelic/browser-agent/features/ajax'
import { JSErrors } from '@newrelic/browser-agent/features/jserrors'
import { Metrics } from '@newrelic/browser-agent/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/features/page_view_timing'
import { SessionTrace } from '@newrelic/browser-agent/features/session_trace'

window.agent = new Agent({
  features: [
    Ajax,
    JSErrors,
    Metrics,
    PageViewEvent,
    PageViewTiming,
    SessionTrace
  ],
  loaderType: 'pro'
})
