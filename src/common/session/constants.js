/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export const PREFIX = 'NRBA'
export const DEFAULT_KEY = 'SESSION'
export const DEFAULT_EXPIRES_MS = 14400000
export const DEFAULT_INACTIVE_MS = 1800000

export const SESSION_EVENTS = {
  STARTED: 'session-started',
  PAUSE: 'session-pause',
  RESET: 'session-reset',
  RESUME: 'session-resume',
  UPDATE: 'session-update'
}

export const SESSION_EVENT_TYPES = {
  SAME_TAB: 'same-tab',
  CROSS_TAB: 'cross-tab'
}

export const MODE = {
  OFF: 0,
  FULL: 1,
  ERROR: 2
}
