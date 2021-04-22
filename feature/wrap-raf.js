/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Request Animation Frame wrapper
var ee = require('ee').get('raf')
var wrapFn = require('../wrap-function')(ee)

var equestAnimationFrame = 'equestAnimationFrame'

module.exports = ee

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
