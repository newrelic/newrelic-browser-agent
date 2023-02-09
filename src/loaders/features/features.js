export const FEATURE_NAMES = {
  ajax: 'ajax',
  jserrors: 'jserrors',
  metrics: 'metrics',
  pageAction: 'page_action',
  pageViewEvent: 'page_view_event',
  pageViewTiming: 'page_view_timing',
  sessionTrace: 'session_trace',
  spa: 'spa'
}

// this is the instrumentation order that has been traditionally implemented.
// unclear if there are any ramifications for the order of wrapping events, so enforcing this order intentionally for now
export const featurePriority = {
  [FEATURE_NAMES.pageViewEvent]: 1,
  [FEATURE_NAMES.pageViewTiming]: 2,
  [FEATURE_NAMES.metrics]: 3,
  [FEATURE_NAMES.jserrors]: 4,
  [FEATURE_NAMES.ajax]: 5,
  [FEATURE_NAMES.sessionTrace]: 6,
  [FEATURE_NAMES.pageAction]: 7,
  [FEATURE_NAMES.spa]: 8
}
