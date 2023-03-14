/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This is TO BE REMOVED AND REPLACED by web-vitals TTFB
 * @type {number} - An integer time-stamp representing the time the agent side-effects first ran
*/
export const importTimestamp = new Date().getTime()

export function now () {
  return Math.round(performance.now())
}
