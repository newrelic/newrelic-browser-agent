/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @file Wraps native timeout and interval methods for instrumentation.
 * This module is used by: jserrors, session_trace, spa.
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
const TIMER_FNS = [SET_TIMEOUT, 'setImmediate', SET_INTERVAL, CLEAR_TIMEOUT, 'clearImmediate']

/**
 * Wraps the global `setTimeout`, `setImmediate`, `setInterval`, `clearTimeout`, and `clearImmediate` functions to emit
 * events on start, end, and error, in the context of a new event emitter scoped only to timer functions. Also wraps
 * the callbacks of `setTimeout` and `setInterval`.
 * @param {Object} sharedEE - The shared event emitter on which a new scoped event emitter will be based.
 * @returns {Object} Scoped event emitter with a debug ID of `timer`.
 */
//eslint-disable-next-line
export function wrapTimer(sharedEE) {
  const ee = scopedEE(sharedEE)
  if (wrapped[ee.debugId]++) // Notice if our wrapping never ran yet, the falsey NaN will not early return; but if it has,
  { return ee } // then we increment the count to track # of feats using this at runtime.
  wrapped[ee.debugId] = 1

  var wrapFn = wfn(ee)

  wrapFn.inPlace(globalScope, TIMER_FNS.slice(0, 2), SET_TIMEOUT + DASH)
  wrapFn.inPlace(globalScope, TIMER_FNS.slice(2, 3), SET_INTERVAL + DASH)
  wrapFn.inPlace(globalScope, TIMER_FNS.slice(3), CLEAR_TIMEOUT + DASH)

  ee.on(SET_INTERVAL + START, interval)
  ee.on(SET_TIMEOUT + START, timer)

  function interval (args, obj, type) {
    args[0] = wrapFn(args[0], 'fn-', null, type)
  }

  function timer (args, obj, type) {
    this.method = type
    this.timerDuration = isNaN(args[1]) ? 0 : +args[1]
    args[0] = wrapFn(args[0], 'fn-', this, type)
  }

  return ee
}

/**
 * Returns an event emitter scoped specifically for the `timer` context. This scoping is a remnant from when all the
 * features shared the same group in the event, to isolate events between features. It will likely be revisited.
 * @param {Object} sharedEE - Optional event emitter on which to base the scoped emitter.
 *     Uses `ee` on the global scope if undefined).
 * @returns {Object} Scoped event emitter with a debug ID of 'timer'.
 */
export function scopedEE (sharedEE) {
  return (sharedEE || baseEE).get('timer')
}
