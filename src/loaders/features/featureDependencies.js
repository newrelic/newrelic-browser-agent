/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from './features'

export function getFeatureDependencyNames (feature) {
  switch (feature) {
    case FEATURE_NAMES.ajax:
      return [FEATURE_NAMES.jserrors]
    case FEATURE_NAMES.sessionTrace:
      return [FEATURE_NAMES.ajax, FEATURE_NAMES.pageViewEvent]
    case FEATURE_NAMES.sessionReplay:
      return [FEATURE_NAMES.sessionTrace]
    case FEATURE_NAMES.pageViewTiming:
      return [FEATURE_NAMES.pageViewEvent] // this could change if we disconnect window load timings
    default:
      return []
  }
}
