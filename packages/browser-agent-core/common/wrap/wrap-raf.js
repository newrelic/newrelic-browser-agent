/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Request Animation Frame wrapper
import { ee as baseEE } from '../event-emitter/contextual-ee'
import { createWrapperWithEmitter as wfn } from './wrap-function'

export function wrapRaf(sharedEE) {
  var ee = scopedEE(sharedEE)
  var wrapFn = wfn(ee)

  var equestAnimationFrame = 'equestAnimationFrame'

  wrapFn.inPlace(window, [
    'r' + equestAnimationFrame,
    'mozR' + equestAnimationFrame,
    'webkitR' + equestAnimationFrame,
    'msR' + equestAnimationFrame
  ], 'raf-')

  ee.on('raf-start', function (args) {
    // Wrap the callback handed to requestAnimationFrame
    args[0] = wrapFn(args[0], 'fn-')
  })

  return ee
}

export function scopedEE(sharedEE){
  return (sharedEE || baseEE).get('raf')
}
