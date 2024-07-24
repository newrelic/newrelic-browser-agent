import { Agent } from '@newrelic/browser-agent/loaders/agent'
import { Ajax } from '@newrelic/browser-agent/features/ajax'
import { GenericEvents } from '@newrelic/browser-agent/features/generic_events'
import { JSErrors } from '@newrelic/browser-agent/features/jserrors'
import { Metrics } from '@newrelic/browser-agent/features/metrics'
import { PageAction } from '@newrelic/browser-agent/features/page_action'
import { PageViewEvent } from '@newrelic/browser-agent/features/page_view_event'
import { PageViewTiming } from '@newrelic/browser-agent/features/page_view_timing'
import { SessionTrace } from '@newrelic/browser-agent/features/session_trace'
import { SessionReplay } from '@newrelic/browser-agent/features/session_replay'
import { Spa } from '@newrelic/browser-agent/features/spa'
import { SoftNav } from '@newrelic/browser-agent/features/soft_navigations'

window.agent = new Agent({
  features: [
    Ajax,
    GenericEvents,
    JSErrors,
    Metrics,
    PageAction,
    PageViewEvent,
    PageViewTiming,
    SessionTrace,
    SessionReplay,
    Spa,
    SoftNav
  ],
  loaderType: 'pro'
})
