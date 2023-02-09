/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * This module is used by: session_trace, spa
 */
import { ee as globalEE } from '../event-emitter/contextual-ee'
import {createWrapperWithEmitter as wfn, unwrapFunction} from './wrap-function'
import { isBrowserScope } from '../util/global-scope'

const wrapped = {}
const HISTORY_FNS = ['pushState', 'replaceState'];

/**
 * Wraps the `pushState` and `replaceState` methods of `window.history` and returns a corresponding event emitter
 * scoped to the history object.
 * @param {Object} sharedEE - The shared event emitter.
 * @returns {Object} Scoped event emitter with a debug ID of `history`.
 */
export function wrapHistory(sharedEE){
  const ee = scopedEE(sharedEE)
  if (!isBrowserScope || wrapped[ee.debugId]++) // Notice if our wrapping never ran yet, the falsey NaN will not early return; but if it has,
    return ee;                                  // then we increment the count to track # of feats using this at runtime. (History API is only avail in browser DOM context.)
  wrapped[ee.debugId] = 1;

  var wrapFn = wfn(ee)
  /**
   * For objects that will be instantiated more than once, we wrap the object's prototype methods. The history object
   * is instantiated only once, so we can wrap its methods directly--and we must wrap the history methods directly as
   * long as [Chromium issue 783382](https://bugs.chromium.org/p/chromium/issues/detail?id=783382) remains unresolved.
   */
  wrapFn.inPlace(window.history, HISTORY_FNS, '-')

  return ee
}
export function unwrapHistory(sharedEE) {
  const ee = scopedEE(sharedEE);

  // Don't unwrap until the LAST of all features that's using this (wrapped count) no longer needs this.
  if (wrapped[ee.debugId] == 1) {
    HISTORY_FNS.forEach(fnName => unwrapFunction(window.history, fnName));
    wrapped[ee.debugId] = Infinity; // rather than leaving count=0, make this marker perma-truthy to prevent re-wrapping by this agent (unsupported)
  } else {
    wrapped[ee.debugId]--;
  }
}
/**
 * Returns an event emitter scoped specifically for the history object. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * 
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter. Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'history'.
 */
export function scopedEE(sharedEE){
  return (sharedEE || globalEE).get('history')
}
