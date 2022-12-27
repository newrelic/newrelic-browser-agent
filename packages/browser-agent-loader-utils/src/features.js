export const FEATURE_NAMES = {
    ajax: "ajax",
    jserrors: "jserrors",
    metrics: "metrics",
    pageAction: "page_action",
    pageViewEvent: "page_view_event",
    pageViewTiming: "page_view_timing",
    sessionTrace: "session_trace",
    spa: "spa"
}

export const asyncFeatures = [
    FEATURE_NAMES.metrics
]

export const syncFeatures = [
    FEATURE_NAMES.ajax,
    FEATURE_NAMES.jserrors,
    FEATURE_NAMES.pageAction,
    FEATURE_NAMES.pageViewEvent,
    FEATURE_NAMES.pageViewTiming,
    FEATURE_NAMES.sessionTrace,
    FEATURE_NAMES.spa
]