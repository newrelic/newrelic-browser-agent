/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Wrapper for pushState and replaceState methods of window.history object
 */

import { ee as globalEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn } from './wrap-function'
import { isBrowserScope } from '../util/global-scope'

const wrapped = {}

/**
 * Wraps the `pushState` and `replaceState` methods of `window.history` and returns a corresponding event emitter
 * scoped to the history object.
 * @param {Object} sharedEE - The shared event emitter.
 * @returns {Object} Scoped event emitter with a debug ID of `history`.
 */
export function wrapHistory (sharedEE) {
  const ee = scopedEE(sharedEE)
  if (wrapped[ee.debugId] || !isBrowserScope) return ee // History API is only relevant within web env
  wrapped[ee.debugId] = true
  var wrapFn = wfn(ee)

  /**
   * For objects that will be instantiated more than once, we wrap the object's prototype methods. The history object
   * is instantiated only once, so we can wrap its methods directly--and we must wrap the history methods directly as
   * long as [Chromium issue 783382](https://bugs.chromium.org/p/chromium/issues/detail?id=783382) remains unresolved.
   */
  wrapFn.inPlace(window.history, ['pushState', 'replaceState'], '-')

  return ee
}

/**
 * Returns an event emitter scoped specifically for the history object. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 *
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter. Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'history'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || globalEE).get('history')
}
