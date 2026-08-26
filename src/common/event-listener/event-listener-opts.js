/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
export function eventListenerOpts (useCapture, abortSignal) {
  return {
    capture: useCapture,
    passive: false,
    signal: abortSignal
  }
}

/** Do not use this within the worker context. */
export function windowAddEventListener (event, listener, capture = false, abortSignal) {
  window.addEventListener(event, listener, eventListenerOpts(capture, abortSignal))
}
/** Do not use this within the worker context. */
export function documentAddEventListener (event, listener, capture = false, abortSignal) {
  document.addEventListener(event, listener, eventListenerOpts(capture, abortSignal))
}
