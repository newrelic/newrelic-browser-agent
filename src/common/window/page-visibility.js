/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { documentAddEventListener, windowAddEventListener } from '../event-listener/event-listener-opts'

/**
 * @param {function} cb - called when a visibility change occurs with the vis state at that time
 * @param {boolean} [toHiddenOnly=false] - only execute the 'cb' when the vis is changing to the hidden state; no arg is passed to 'cb' if used
 * @returns void
 */
export function subscribeToVisibilityChange (cb, toHiddenOnly = false, capture, abortSignal) {
  documentAddEventListener('visibilitychange', handleVisibilityChange, capture, abortSignal)

  function handleVisibilityChange () {
    if (toHiddenOnly) { // trigger cb on change to hidden state only
      if (document.visibilityState === 'hidden') cb()
      return
    }
    cb(document.visibilityState)
  }
}

export function subscribeToPageUnload (cb, capture, abortSignal) {
  windowAddEventListener('pagehide', cb, capture, abortSignal)
}
