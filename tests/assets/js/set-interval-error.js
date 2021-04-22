/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

;(function intervalCallback () {
  var timer = window.setInterval(function () {
    window.clearInterval(timer)
    window.intervalFired = true
    throw new Error('interval callback')
  }, 0)
})()
