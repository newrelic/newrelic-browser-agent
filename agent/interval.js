/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = function interval (fn, ms) {
  setTimeout(function tick () {
    try {
      fn()
    } finally {
      setTimeout(tick, ms)
    }
  }, ms)
}
