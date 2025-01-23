/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file Wraps the window's DOM mutation observer for instrumentation.
 * This module is used by: spa.
 */

import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn } from './wrap-function'
import { globalScope, isBrowserScope } from '../constants/runtime'

const wrapped = {}

/**
 * In web environments only, wraps the `window.MutationObserver` function to emit events on start, end, and error, in
 * the context of a new event emitter scoped only to mutations.
 * @param {Object} sharedEE - The shared event emitter on which a new scoped event emitter will be based.
 * @returns {Object} Scoped event emitter with a debug ID of `mutation`.
 */
export function wrapMutation (sharedEE) {
  const ee = scopedEE(sharedEE)

  // Notice if our wrapping never ran yet, the falsy NaN will not early return; but if it has,
  // then we increment the count to track # of feats using this at runtime. Mutations API is only
  // available in browser DOM context.
  if (!isBrowserScope || wrapped[ee.debugId]) return ee
  wrapped[ee.debugId] = true // otherwise, first feature to wrap mutations

  var wrapFn = wfn(ee)
  var OriginalObserver = globalScope.MutationObserver

  if (OriginalObserver) {
    window.MutationObserver = function WrappedMutationObserver (cb) {
      if (this instanceof OriginalObserver) {
        return new OriginalObserver(wrapFn(cb, 'fn-'))
      } else {
        return OriginalObserver.apply(this, arguments)
      }
    }

    MutationObserver.prototype = OriginalObserver.prototype
  }
  return ee
}

/**
 * Returns an event emitter scoped specifically for the `mutation` context. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter.
 *     Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'mutation'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('mutation')
}
