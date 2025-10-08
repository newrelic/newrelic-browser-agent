/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MODE } from '../../common/session/constants'
import { FEATURE_NAMES } from '../../loaders/features/features'

export const FEATURE_NAME = FEATURE_NAMES.sessionReplay

export const SR_EVENT_EMITTER_TYPES = {
  RECORD: 'recordReplay',
  PAUSE: 'pauseReplay',
  ERROR_DURING_REPLAY: 'errorDuringReplay'
}

export const AVG_COMPRESSION = 0.12
export const RRWEB_EVENT_TYPES = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5
}
/** Interval between forcing new full snapshots -- 15 seconds in error mode (x2), 5 minutes in full mode */
export const CHECKOUT_MS = { [MODE.ERROR]: 15000, [MODE.FULL]: 300000, [MODE.OFF]: 0 }
export const ABORT_REASONS = {
  RESET: {
    message: 'Session was reset',
    sm: 'Reset'
  },
  IMPORT: {
    message: 'Recorder failed to import',
    sm: 'Import'
  },
  TOO_MANY: {
    message: '429: Too Many Requests',
    sm: 'Too-Many'
  },
  TOO_BIG: {
    message: 'Payload was too large',
    sm: 'Too-Big'
  },
  CROSS_TAB: {
    message: 'Session Entity was set to OFF on another tab',
    sm: 'Cross-Tab'
  },
  ENTITLEMENTS: {
    message: 'Session Replay is not allowed and will not be started',
    sm: 'Entitlement'
  },
  TIMEOUT: {
    message: 'Hit the safety timeout',
    sm: 'Timeout'
  }
}
/** Reserved room for query param attrs */
export const QUERY_PARAM_PADDING = 5000

export const TRIGGERS = {
  API: 'api',
  RESUME: 'resume',
  SWITCH_TO_FULL: 'switchToFull',
  INITIALIZE: 'initialize',
  PRELOAD: 'preload'
}
