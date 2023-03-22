/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Wraps `window.requestAnimationFrame` for instrumentation.
 * This module is used by: jserror, session_trace.
 */

import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn, unwrapFunction } from './wrap-function'
import { isBrowserScope } from '../util/global-scope'

const wrapped = {}
const RAF_NAME = 'requestAnimationFrame'

/**
 * Wraps the `window.requestAnimationFrame` method to emit events on start, end, and error, in the context of a new
 * event emitter ("raf") scoped only to requestAnimationFrame. Also wraps the callback passed to the method.
 * @param {Object} sharedEE - The shared event emitter on which a new scoped event emitter will be based.
 * @returns {Object} Scoped event emitter with a debug ID of `raf`.
 */
export function wrapRaf (sharedEE) {
  const ee = scopedEE(sharedEE)
  if (!isBrowserScope || wrapped[ee.debugId]++) // Notice if our wrapping never ran yet, the falsey NaN will not early return; but if it has,
  { return ee } // then we increment the count to track # of feats using this at runtime. (RAF is only avail in browser DOM context.)
  wrapped[ee.debugId] = 1

  var wrapFn = wfn(ee)

  wrapFn.inPlace(window, [RAF_NAME], 'raf-')

  ee.on('raf-start', function (args) {
    // Wrap the callback handed to requestAnimationFrame
    args[0] = wrapFn(args[0], 'fn-')
  })

  return ee
}

/**
 * Returns an event emitter scoped specifically for the `raf` context. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter.
 *     Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'raf'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('raf')
}
