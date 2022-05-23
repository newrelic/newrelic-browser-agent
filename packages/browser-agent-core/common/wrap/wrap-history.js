/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// History pushState wrapper
import {ee as baseEE} from '../event-emitter/contextual-ee'
import {createWrapperWithEmitter as wfn} from './wrap-function'

export function wrapHistory(sharedEE){
  var ee = scopedEE(sharedEE)
  var wrapFn = wfn(ee)
  
  var prototype = window.history && window.history.constructor && window.history.constructor.prototype
  var object = window.history
  if (prototype && prototype.pushState && prototype.replaceState) {
    object = prototype
  }
  // log('wrap history')
  wrapFn.inPlace(object, [ 'pushState', 'replaceState' ], '-')

  return ee
}
3
export function scopedEE(sharedEE){
  return (sharedEE || baseEE).get('history')
}