/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { eventListenerOpts } from './event-listener-opts'

// Safely add an event listener to window in any browser
export function addE (sType, callback) {
  if ('addEventListener' in window) {
    return window.addEventListener(sType, callback, eventListenerOpts(false))
  } else if ('attachEvent' in window) {
    return window.attachEvent('on' + sType, callback)
  }
}
