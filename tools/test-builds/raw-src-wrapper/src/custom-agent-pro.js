import { Agent } from '@newrelic/browser-agent/src/loaders/agent'
import { Ajax } from '@newrelic/browser-agent/src/features/ajax'
import { JSErrors } from '@newrelic/browser-agent/src/features/jserrors'
import { Metrics } from '@newrelic/browser-agent/src/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/src/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/src/features/page_view_timing'
import { SessionTrace } from '@newrelic/browser-agent/src/features/session_trace'
import { GenericEvent } from '@newrelic/browser-agent/features/generic-event'

new Agent({
  features: [
    Ajax,
    JSErrors,
    Metrics,
    GenericEvent,
    PageViewEvent,
    PageViewTiming,
    SessionTrace
  ],
  loaderType: 'pro'
})
