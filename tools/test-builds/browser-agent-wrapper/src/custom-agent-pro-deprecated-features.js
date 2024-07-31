import { Agent } from '@newrelic/browser-agent/loaders/agent'
import { Ajax } from '@newrelic/browser-agent/features/ajax'
import { PageAction } from '@newrelic/browser-agent/features/page_action'
import { JSErrors } from '@newrelic/browser-agent/features/jserrors'
import { Metrics } from '@newrelic/browser-agent/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/features/page_view_timing'
import { SessionTrace } from '@newrelic/browser-agent/features/session_trace'
import { SessionReplay } from '@newrelic/browser-agent/features/session_replay'

window.agent = new Agent({
  features: [
    Ajax,
    PageAction, // PageAction is now deprecated in favor of GenericEvents, BUT the loader should still work if this is the entry point
    JSErrors,
    Metrics,
    PageViewEvent,
    PageViewTiming,
    SessionTrace,
    SessionReplay
  ],
  loaderType: 'pro'
})
