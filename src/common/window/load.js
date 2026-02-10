/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { windowAddEventListener, documentAddEventListener } from '../event-listener/event-listener-opts'
import { single } from '../util/invoke'

export function checkState () {
  return (typeof document === 'undefined' || document.readyState === 'complete')
}

/**
 * Executes a callback when the window 'load' event fires, or immediately if the load event has already occurred.
 * Sets up a backup polling mechanism in the rare case that the browser does not fire the load event when the page has loaded,
 * such as in certain iframe scenarios like ChatGPT connector frames. Cannot use document.readystatechange event here because
 * it blocks back/forward cache in Safari browsers.
 * @param {Function} cb
 * @param {boolean} [useCapture]
 * @returns {void}
 */
export function onWindowLoad (cb, useCapture) {
  if (checkState()) return cb()
  const singleCb = single(cb)
  const poll = setInterval(() => {
    if (checkState()) {
      clearInterval(poll)
      singleCb()
    }
  }, 500)
  windowAddEventListener('load', singleCb, useCapture)
}

export function onDOMContentLoaded (cb) {
  if (checkState()) return cb()
  documentAddEventListener('DOMContentLoaded', cb)
}

export function onPopstateChange (cb) {
  if (checkState()) return cb()
  windowAddEventListener('popstate', cb)
}
