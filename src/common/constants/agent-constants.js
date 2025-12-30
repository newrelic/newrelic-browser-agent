/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../../loaders/features/features'

export const IDEAL_PAYLOAD_SIZE = 16000
export const MAX_PAYLOAD_SIZE = 1000000
export const DEFAULT_KEY = 'NR_CONTAINER_AGENT'
export const SESSION_ERROR = 'SESSION_ERROR'
export const NEW_RELIC_MFE_ID_HEADER = 'newrelic-mfe-id'

export const SUPPORTS_REGISTERED_ENTITIES = {
  [FEATURE_NAMES.logging]: true,
  // flip other features here when they are supported by DEM consumers, and can then safely remove usage of feature flags
  [FEATURE_NAMES.genericEvents]: false,
  [FEATURE_NAMES.jserrors]: false,
  [FEATURE_NAMES.ajax]: false
}
