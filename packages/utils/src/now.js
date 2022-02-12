/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import performanceCheck from './performance-check'

var lastTimestamp = new Date().getTime()
export var offset = lastTimestamp

export default now

export function now () {
  if (performanceCheck.exists && performance.now) {
    return Math.round(performance.now())
  }
  // ensure a new timestamp is never smaller than a previous timestamp
  return (lastTimestamp = Math.max(new Date().getTime(), lastTimestamp)) - offset
}

export function getLastTimestamp() {
  return lastTimestamp
}
