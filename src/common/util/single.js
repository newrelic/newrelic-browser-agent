/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import slice from 'lodash._slice'

export function single (fn) {
  var called = false
  var res

  return function () {
    if (called) return res
    called = true
    res = fn.apply(this, slice(arguments))
    return res
  }
}
