/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
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
const TIMER_NAMES = [SET_TIMEOUT, 'setImmediate', SET_INTERVAL, CLEAR_TIMEOUT, 'clearImmediate'];

//eslint-disable-next-line
export function wrapTimer(sharedEE) {
  const ee = scopedEE(sharedEE)
  if (wrapped[ee.debugId]) return ee
  wrapped[ee.debugId] = true
  var wrapFn = wfn(ee)

  wrapFn.inPlace(globalScope, TIMER_NAMES.slice(0, 2), SET_TIMEOUT + DASH)
  wrapFn.inPlace(globalScope, TIMER_NAMES.slice(2, 3), SET_INTERVAL + DASH)
  wrapFn.inPlace(globalScope, TIMER_NAMES.slice(3), CLEAR_TIMEOUT + DASH)

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
  if (wrapped[ee.debugId] === true) {
    TIMER_NAMES.forEach(fn => unwrapFunction(globalScope, fn));
    wrapped[ee.debugId] = "unwrapped";  // keeping this map marker truthy to prevent re-wrapping by this agent (unsupported)
  }
}
export function scopedEE(sharedEE){
  return (sharedEE || baseEE).get('timer')
}
