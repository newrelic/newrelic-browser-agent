/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { eventListenerOpts } from './event-listener-opts'

// Safely add an event listener to WindowOrWorkerGlobalScope in any browser
export function addE (sType, callback) {
  if ('addEventListener' in self) {
    return self.addEventListener(sType, callback, eventListenerOpts(false))
  } else if ('attachEvent' in self) {
    return self.attachEvent('on' + sType, callback)
  }
}
