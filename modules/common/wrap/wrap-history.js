/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// History pushState wrapper
import {ee as contextualEE} from '../event-emitter/contextual-ee'
import {createWrapperWithEmitter as wfn} from './wrap-function'
export var ee = contextualEE.get('history')
var wrapFn = wfn(ee)

export default ee

var prototype = window.history && window.history.constructor && window.history.constructor.prototype
var object = window.history
if (prototype && prototype.pushState && prototype.replaceState) {
  object = prototype
}
// log('wrap history')
wrapFn.inPlace(object, [ 'pushState', 'replaceState' ], '-')
