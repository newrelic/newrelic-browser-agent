/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import {global as globalEE} from '../event-emitter/contextual-ee'
import {createWrapperWithEmitter as wfn} from './wrap-function'
export var ee = globalEE.get('mutation')
var wrapFn = wfn(ee)
var OriginalObserver = NREUM.o.MO

export default ee

if (OriginalObserver) {
  window.MutationObserver = function WrappedMutationObserver (cb) {
    if (this instanceof OriginalObserver) {
      return new OriginalObserver(wrapFn(cb, 'fn-'))
    } else {
      return OriginalObserver.apply(this, arguments)
    }
  }

  MutationObserver.prototype = OriginalObserver.prototype
}
