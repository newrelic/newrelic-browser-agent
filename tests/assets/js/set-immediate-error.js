/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

;(function immediateCallback () {
  if ('setImmediate' in window) {
    window.setImmediate(function () {
      window.setImmediateFired = true
      throw new Error('immediate callback')
    })
  }
})()
