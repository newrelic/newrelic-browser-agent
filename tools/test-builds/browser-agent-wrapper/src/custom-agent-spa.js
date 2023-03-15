import { Agent } from '@newrelic/browser-agent/custom-agent'
import {
  Ajax,
  JSErrors,
  Metrics,
  PageAction,
  PageViewEvent,
  PageViewTiming,
  SessionTrace,
  Spa
} from '@newrelic/browser-agent/features'

new Agent({
  features: [
    Ajax,
    JSErrors,
    Metrics,
    PageAction,
    PageViewEvent,
    PageViewTiming,
    SessionTrace,
    Spa
  ],
  loaderType: 'spa'
})
