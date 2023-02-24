/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * This module is used by: jserror, session_trace
 * Request Animation Frame wrapper
 */
import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn, unwrapFunction } from './wrap-function'
import { isBrowserScope } from '../util/global-scope'

const wrapped = {}
const RAF_NAME = 'requestAnimationFrame'

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
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('raf')
}
