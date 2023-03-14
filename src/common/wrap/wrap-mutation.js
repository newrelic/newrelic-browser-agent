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
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('mutation')
}
