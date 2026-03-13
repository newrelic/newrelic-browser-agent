/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
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
  [FEATURE_NAMES.genericEvents]: true,
  [FEATURE_NAMES.jserrors]: true,
  [FEATURE_NAMES.ajax]: true
}
