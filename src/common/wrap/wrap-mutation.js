/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * This module is used by: spa
 */
import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn } from './wrap-function'
import { originals } from '../config/config'
import { isBrowserScope } from '../util/global-scope'

const wrapped = {}

export function wrapMutation (sharedEE) {
  const ee = scopedEE(sharedEE)
  if (!isBrowserScope || wrapped[ee.debugId]) // relates to the DOM tree (web env only)
  { return ee }
  wrapped[ee.debugId] = true

  var wrapFn = wfn(ee)
  var OriginalObserver = originals.MO

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
/*
export function unwrapMutation (sharedEE) {
  const ee = scopedEE(sharedEE)
  if (wrapped[ee.debugId] === true) {
    // The complete unwinding would be to disconnect the existing wrapped callbacks too and re-observe with base cb, but that's not feasible because,
    // aside from having to store & track all cb's, the caller handles references to the existing observer objects. So we can only restore the global.
    window.MutationObserver = originals.MO
    wrapped[ee.debugId] = 'unwrapped' // keeping this map marker truthy to prevent re-wrapping by this agent (unsupported)
  }
}
*/
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('mutation')
}
