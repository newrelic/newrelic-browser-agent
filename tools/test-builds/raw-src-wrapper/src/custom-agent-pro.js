import { Agent } from '@newrelic/browser-agent/src/loaders/agent'
import { Ajax } from '@newrelic/browser-agent/src/features/ajax'
import { GenericEvents } from '@newrelic/browser-agent/src/features/generic_events'
import { JSErrors } from '@newrelic/browser-agent/src/features/jserrors'
import { Metrics } from '@newrelic/browser-agent/src/features/metrics'
import { PageViewEvent } from '@newrelic/browser-agent/src/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/src/features/page_view_timing'
import { SessionTrace } from '@newrelic/browser-agent/src/features/session_trace'
import { SessionReplay } from '@newrelic/browser-agent/src/features/session_replay'

window.agent = new Agent({
  features: [
    Ajax,
    GenericEvents,
    JSErrors,
    Metrics,
    PageViewEvent,
    PageViewTiming,
    SessionTrace,
    SessionReplay
  ],
  loaderType: 'pro'
})
