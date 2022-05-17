/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

;(function timeoutCallback () {
  window.setTimeout(function () {
    window.setTimeoutFired = true
    throw new Error('timeout callback')
  }, 0)
})()
