/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { windowAddEventListener, documentAddEventListener } from '../event-listener/event-listener-opts'

export function checkState () {
  return (typeof document === 'undefined' || document.readyState === 'complete')
}

export function onWindowLoad (cb, useCapture) {
  if (checkState()) return cb()
  windowAddEventListener('load', cb, useCapture)
}

export function onDOMContentLoaded (cb) {
  if (checkState()) return cb()
  documentAddEventListener('DOMContentLoaded', cb)
}

export function onPopstateChange (cb) {
  if (checkState()) return cb()
  windowAddEventListener('popstate', cb)
}
