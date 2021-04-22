/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// History pushState wrapper
var ee = require('ee').get('history')
var wrapFn = require('../wrap-function')(ee)

module.exports = ee

var prototype = window.history && window.history.constructor && window.history.constructor.prototype
var object = window.history
if (prototype && prototype.pushState && prototype.replaceState) {
  object = prototype
}
wrapFn.inPlace(object, [ 'pushState', 'replaceState' ], '-')
