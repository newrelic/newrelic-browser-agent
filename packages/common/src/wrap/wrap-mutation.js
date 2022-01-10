/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var ee = require('../contextual-ee').globabl.get('mutation')
var wrapFn = require('./wrap-function')(ee)
var OriginalObserver = NREUM.o.MO

module.exports = ee

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
