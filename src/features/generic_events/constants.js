/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../../loaders/features/features'

export const FEATURE_NAME = FEATURE_NAMES.genericEvents

export const OBSERVED_EVENTS = ['auxclick', 'click', 'copy', 'keydown', 'paste', 'scrollend']
export const OBSERVED_WINDOW_EVENTS = ['focus', 'blur']

export const RAGE_CLICK_THRESHOLD_EVENTS = 4
export const RAGE_CLICK_THRESHOLD_MS = 1000

export const FRUSTRATION_TIMEOUT_MS = 2000

export const RESERVED_EVENT_TYPES = ['PageAction', 'UserAction', 'BrowserPerformance']

export const FEATURE_FLAGS = {
  RESOURCES: 'experimental.resources'
}
