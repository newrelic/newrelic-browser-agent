/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { windowAddEventListener, documentAddEventListener } from '../event-listener/event-listener-opts'

export function checkState () {
  return (typeof document === 'undefined' || document.readyState === 'complete')
}

/**
 * Add a callback to be invoked when the window has finished loading. Also fires the callback if the window has already loaded at setup time.
 * @param {*} cb The callback to be invoked
 * @param {*} useCapture whether to fire the callback in the capture phase
 * @param {*} abortSignal An abort controller signal to control the listener
 * @returns {void}
 */
export function onWindowLoad (cb, useCapture, abortSignal) {
  if (checkState()) return cb()
  windowAddEventListener('load', cb, useCapture, abortSignal)
}

export function onDOMContentLoaded (cb) {
  if (checkState()) return cb()
  documentAddEventListener('DOMContentLoaded', cb)
}

export function onPopstateChange (cb) {
  if (checkState()) return cb()
  windowAddEventListener('popstate', cb)
}
