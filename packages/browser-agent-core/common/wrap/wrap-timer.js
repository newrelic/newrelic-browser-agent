/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn } from './wrap-function'

const wrapped = {}
//eslint-disable-next-line
export function wrapTimer(sharedEE) {
  const ee = scopedEE(sharedEE)
  if (wrapped[ee.debugId]) return ee
  wrapped[ee.debugId] = true
  var wrapFn = wfn(ee)

  var SET_TIMEOUT = 'setTimeout'
  var SET_INTERVAL = 'setInterval'
  var CLEAR_TIMEOUT = 'clearTimeout'
  var START = '-start'
  var DASH = '-'

  wrapFn.inPlace(window, [SET_TIMEOUT, 'setImmediate'], SET_TIMEOUT + DASH)
  wrapFn.inPlace(window, [SET_INTERVAL], SET_INTERVAL + DASH)
  wrapFn.inPlace(window, [CLEAR_TIMEOUT, 'clearImmediate'], CLEAR_TIMEOUT + DASH)

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

export function scopedEE(sharedEE){
  return (sharedEE || baseEE).get('timer')
}
