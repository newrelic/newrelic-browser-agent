/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleEE, globalEE } from './handle'

// export default defaultRegister
export { globalRegister as global }
export { defaultRegister as registerHandler }

defaultRegister.on = registerWithSpecificEmitter

var handlers = defaultRegister.handlers = {}
var globalHandlers = globalRegister.handlers = {}

export function defaultRegister (type, handler, group, ee) {
  registerWithSpecificEmitter(ee || handleEE, handlers, type, handler, group)
}

function globalRegister (type, handler, group) {
  registerWithSpecificEmitter(globalEE, globalHandlers, type, handler, group)
}

function registerWithSpecificEmitter (ee, handlers, type, handler, group) {
  if (!group) group = 'feature'
  if (!ee) ee = handleEE

  if (ee.isBuffering(type)) {
    var groupHandlers = handlers[group] = handlers[group] || {}
    var list = groupHandlers[type] = groupHandlers[type] || []
    list.push([ee, handler])
  } else {
    ee.on(type, handler)
  }
}
