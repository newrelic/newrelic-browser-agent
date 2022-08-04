/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {exists} from './performance-check'

var lastTimestamp = new Date().getTime()
var offset = lastTimestamp

export function now () {
  if (exists && performance.now) {
    return Math.round(performance.now())
  }
  // ensure a new timestamp is never smaller than a previous timestamp
  return (lastTimestamp = Math.max(new Date().getTime(), lastTimestamp)) - offset
}

export function getLastTimestamp() {
  return lastTimestamp
}

export function setOffset (val) {
  offset = val
}

export function getOffset () {
  return offset
}
