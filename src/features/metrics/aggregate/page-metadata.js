/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function evaluatePageMetadata (pageMetadata) {
  try {
    const supportabilityTags = []

    // Track if replay/trace/error harvests actually occurred (key only exists when harvested)
    const AUDIT = 'audit'
    const FALSE = 'false'
    const TRUE = 'true'
    const NEGATIVE = 'negative'
    const POSITIVE = 'positive'
    const PAGE_VIEW = 'page_view'
    const SESSION_REPLAY = 'session_replay'
    const HAS_REPLAY = 'hasReplay'
    const HAS_TRACE = 'hasTrace'
    const HAS_ERROR = 'hasError'

    // Report SM like... audit/<feature_name>/<hasReplay|hasTrace|hasError>/<true|false>/<negative|positive>
    const formTag = (...strings) => strings.join('/')

    function evaluateTag (feature, flag, hasFlag, hasHarvest) {
      if (hasFlag) {
      // False positive: flag true, but no harvest
        if (!hasHarvest) supportabilityTags.push(formTag(AUDIT, feature, flag, FALSE, POSITIVE))
        // True positive (correct)
        else supportabilityTags.push(formTag(AUDIT, feature, flag, TRUE, POSITIVE))
      } else {
      // False negative: flag false, but harvest occurred
        if (hasHarvest) supportabilityTags.push(formTag(AUDIT, feature, flag, FALSE, NEGATIVE))
        // True negative (correct)
        else supportabilityTags.push(formTag(AUDIT, feature, flag, TRUE, NEGATIVE))
      }
    }

    if (pageMetadata.page_view_event) {
      evaluateTag(PAGE_VIEW, HAS_REPLAY, pageMetadata.page_view_event.hasReplay, !!pageMetadata.session_replay)
      evaluateTag(PAGE_VIEW, HAS_TRACE, pageMetadata.page_view_event.hasTrace, !!pageMetadata.session_trace)
    }

    if (pageMetadata.session_replay) {
      evaluateTag(SESSION_REPLAY, HAS_ERROR, pageMetadata.session_replay.hasError, !!pageMetadata.jserrors)
    }

    return supportabilityTags
  } catch (err) {
    return []
  }
}
