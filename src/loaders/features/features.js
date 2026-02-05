/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// To reduce build size a bit:
export const EVENTS = 'events'
export const JSERRORS = 'jserrors'
export const BLOBS = 'browser/blobs'
export const RUM = 'rum'
export const LOGS = 'browser/logs'

export const FEATURE_NAMES = {
  ajax: 'ajax',
  genericEvents: 'generic_events',
  jserrors: JSERRORS,
  logging: 'logging',
  metrics: 'metrics',
  /**
   * @deprecated This feature has been replaced by Generic Events. Use/Import `GenericEvents` instead. This wrapper will be removed in a future release
   */
  pageAction: 'page_action',
  pageViewEvent: 'page_view_event',
  pageViewTiming: 'page_view_timing',
  sessionReplay: 'session_replay',
  sessionTrace: 'session_trace',
  softNav: 'soft_navigations'
}

/**
 * The order in which features will be instrumented. This is the traditional order. It's unclear if the order of
 * wrapping events has any ramifications, so we are enforcing this order intentionally for now.
 */
export const featurePriority = {
  [FEATURE_NAMES.pageViewEvent]: 1,
  [FEATURE_NAMES.pageViewTiming]: 2,
  [FEATURE_NAMES.metrics]: 3,
  [FEATURE_NAMES.jserrors]: 4,
  [FEATURE_NAMES.softNav]: 5,
  [FEATURE_NAMES.ajax]: 6,
  [FEATURE_NAMES.sessionTrace]: 7,
  [FEATURE_NAMES.sessionReplay]: 8,
  [FEATURE_NAMES.logging]: 9,
  [FEATURE_NAMES.genericEvents]: 10
}

export const FEATURE_TO_ENDPOINT = {
  [FEATURE_NAMES.pageViewEvent]: RUM,
  [FEATURE_NAMES.pageViewTiming]: EVENTS,
  [FEATURE_NAMES.ajax]: EVENTS,
  [FEATURE_NAMES.softNav]: EVENTS,
  [FEATURE_NAMES.metrics]: JSERRORS,
  [FEATURE_NAMES.jserrors]: JSERRORS,
  [FEATURE_NAMES.sessionTrace]: BLOBS,
  [FEATURE_NAMES.sessionReplay]: BLOBS,
  [FEATURE_NAMES.logging]: LOGS,
  [FEATURE_NAMES.genericEvents]: 'ins'
}
