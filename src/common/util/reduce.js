/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function reduce (arr, fn, next) {
  var i = 0
  if (typeof next === 'undefined') {
    next = arr[0]
    i = 1
  }

  for (i; i < arr.length; i++) {
    next = fn(next, arr[i])
  }

  return next
}
