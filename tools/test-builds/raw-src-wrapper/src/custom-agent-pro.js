import { Agent } from '@newrelic/browser-agent/src/loaders/agent'
import { Ajax } from '@newrelic/browser-agent/src/features/ajax'
import { JSErrors } from '@newrelic/browser-agent/src/features/jserrors'
import { Metrics } from '@newrelic/browser-agent/src/features/metrics'
import { PageAction } from '@newrelic/browser-agent/src/features/page_action'
import { PageViewEvent } from '@newrelic/browser-agent/src/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/src/features/page_view_timing'
import { SessionTrace } from '@newrelic/browser-agent/src/features/session_trace'

window.agent = new Agent({
  features: [
    Ajax,
    JSErrors,
    Metrics,
    PageAction,
    PageViewEvent,
    PageViewTiming,
    SessionTrace
  ],
  loaderType: 'pro'
})
