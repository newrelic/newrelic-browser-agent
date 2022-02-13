/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// History pushState wrapper
import {global as globalEE} from '../event-emitter/contextual-ee'
import {createWrapperWithEmitter as wfn} from './wrap-function'
export var ee = globalEE.get('history')
var wrapFn = wfn(ee)

export default ee

var prototype = window.history && window.history.constructor && window.history.constructor.prototype
var object = window.history
if (prototype && prototype.pushState && prototype.replaceState) {
  object = prototype
}
wrapFn.inPlace(object, [ 'pushState', 'replaceState' ], '-')
