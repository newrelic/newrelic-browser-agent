/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * This module is used by: jserrors, session_trace, spa
 */
import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn, unwrapFunction } from './wrap-function'
import { globalScope } from '../util/global-scope'

const wrapped = {}
const SET_TIMEOUT = 'setTimeout'
const SET_INTERVAL = 'setInterval'
const CLEAR_TIMEOUT = 'clearTimeout'
const START = '-start'
const DASH = '-'
const TIMER_FNS = [SET_TIMEOUT, 'setImmediate', SET_INTERVAL, CLEAR_TIMEOUT, 'clearImmediate'];

//eslint-disable-next-line
export function wrapTimer(sharedEE) {
  const ee = scopedEE(sharedEE)
  if (wrapped[ee.debugId]++)  // Notice if our wrapping never ran yet, the falsey NaN will not early return; but if it has,
    return ee;                // then we increment the count to track # of feats using this at runtime.
  wrapped[ee.debugId] = 1;
  
  var wrapFn = wfn(ee)

  wrapFn.inPlace(globalScope, TIMER_FNS.slice(0, 2), SET_TIMEOUT + DASH)
  wrapFn.inPlace(globalScope, TIMER_FNS.slice(2, 3), SET_INTERVAL + DASH)
  wrapFn.inPlace(globalScope, TIMER_FNS.slice(3), CLEAR_TIMEOUT + DASH)

  ee.on(SET_INTERVAL + START, interval)
  ee.on(SET_TIMEOUT + START, timer)

  function interval(args, obj, type) {
    args[0] = wrapFn(args[0], 'fn-', null, type)
  }

  function timer(args, obj, type) {
    this.method = type
    this.timerDuration = isNaN(args[1]) ? 0 : +args[1]
    args[0] = wrapFn(args[0], 'fn-', this, type)
  }

  return ee
}
export function unwrapTimer(sharedEE) {
  const ee = scopedEE(sharedEE);
  
  // Don't unwrap until the LAST of all features that's using this (wrapped count) no longer needs this, but always decrement the count after checking it per unwrap call.
  if (wrapped[ee.debugId]-- == 1) {
    TIMER_FNS.forEach(fn => unwrapFunction(globalScope, fn));
    wrapped[ee.debugId] = Infinity; // rather than leaving count=0, make this marker perma-truthy to prevent re-wrapping by this agent (unsupported)
  }
}
export function scopedEE(sharedEE){
  return (sharedEE || baseEE).get('timer')
}
