/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Request Animation Frame wrapper
import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn, unwrapFunction } from './wrap-function'
import { isBrowserScope } from '../util/global-scope'

const wrapped = {};
const RAF_NAME = 'requestAnimationFrame';

export function wrapRaf(sharedEE) {
  const ee = scopedEE(sharedEE)
  if (wrapped[ee.debugId] || !isBrowserScope) return ee; // animation frames inherently tied to window
  wrapped[ee.debugId] = true
  var wrapFn = wfn(ee)

  wrapFn.inPlace(window, [RAF_NAME], 'raf-')

  ee.on('raf-start', function (args) {
    // Wrap the callback handed to requestAnimationFrame
    args[0] = wrapFn(args[0], 'fn-')
  })

  return ee
}
export function unwrapRaf(sharedEE) {
  const ee = scopedEE(sharedEE);
  if (wrapped[ee.debugId] === true) {  // only if it's wrapped first, e.g. if execution context is browser window for RAF
    unwrapFunction(window, RAF_NAME);
    wrapped[ee.debugId] = "unwrapped";  // keeping this map marker truthy to prevent re-wrapping by this agent (unsupported)
  }
}
export function scopedEE(sharedEE){
  return (sharedEE || baseEE).get('raf')
}
