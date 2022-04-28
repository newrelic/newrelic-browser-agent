/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Request Animation Frame wrapper
import {ee as contextualEE} from '../event-emitter/contextual-ee'
import {createWrapperWithEmitter as wfn} from './wrap-function'
export var ee = contextualEE.get('raf')
var wrapFn = wfn(ee)

var equestAnimationFrame = 'equestAnimationFrame'

// eslint-disable-next-line
export default ee

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
