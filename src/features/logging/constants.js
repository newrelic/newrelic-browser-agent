/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { FEATURE_NAMES } from '../../loaders/features/features'

export const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  TRACE: 'TRACE'
}

export const LOGGING_MODE = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
}

export const LOGGING_EVENT_EMITTER_CHANNEL = 'log'

export const FEATURE_NAME = FEATURE_NAMES.logging
