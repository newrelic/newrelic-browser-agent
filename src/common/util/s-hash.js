/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function sHash (s) {
  var i
  var h = 0

  for (i = 0; i < s.length; i++) {
    h += ((i + 1) * s.charCodeAt(i))
  }
  return Math.abs(h)
}
