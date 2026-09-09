/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {number} - Correlations are keyed only by script URL and never cleared per-registration, so a script registered more than once in a session (SPA remount, shared bundle, etc.) can reuse a correlation from a much earlier load. If the correlation's recorded start predates `registeredAt` by more than this, treat it as stale and fall back to `registeredAt`. */
export const CORRELATION_STALE_THRESHOLD_MS = 10000
