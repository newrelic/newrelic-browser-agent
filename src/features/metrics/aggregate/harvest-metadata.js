/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function evaluateHarvestMetadata (pageMetadata) {
  try {
    const supportabilityTags = []

    // Report SM like... audit/<feature_name>/<hasReplay|hasTrace|hasError>/<true|false>/<negative|positive>
    const formTag = (...strings) => strings.join('/')

    // Track if replay/trace/error harvests actually occurred (key only exists when harvested)
    function evaluateTag (feature, flag, hasFlag, hasHarvest) {
      const AUDIT = 'audit'
      if (hasFlag) {
      // False positive: flag true, but no harvest
        if (!hasHarvest) supportabilityTags.push(formTag(AUDIT, feature, flag, 'false', 'positive'))
        // True positive (correct)
        else supportabilityTags.push(formTag(AUDIT, feature, flag, 'true', 'positive'))
      } else {
      // False negative: flag false, but harvest occurred
        if (hasHarvest) supportabilityTags.push(formTag(AUDIT, feature, flag, 'false', 'negative'))
        // True negative (correct)
        else supportabilityTags.push(formTag(AUDIT, feature, flag, 'true', 'negative'))
      }
    }

    if (pageMetadata.page_view_event) {
      evaluateTag('page_view', 'hasReplay', pageMetadata.page_view_event.hasReplay, !!pageMetadata.session_replay)
      evaluateTag('page_view', 'hasTrace', pageMetadata.page_view_event.hasTrace, !!pageMetadata.session_trace)
    }

    if (pageMetadata.session_replay) {
      evaluateTag('session_replay', 'hasError', pageMetadata.session_replay.hasError, !!pageMetadata.jserrors)
    }

    return supportabilityTags
  } catch (err) {
    return []
  }
}
