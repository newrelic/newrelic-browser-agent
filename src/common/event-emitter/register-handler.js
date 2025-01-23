/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleEE } from './handle'

export { defaultRegister as registerHandler }

defaultRegister.on = registerWithSpecificEmitter

var handlers = defaultRegister.handlers = {}

export function defaultRegister (type, handler, group, ee) {
  registerWithSpecificEmitter(ee || handleEE, handlers, type, handler, group)
}

function registerWithSpecificEmitter (ee, handlers, type, handler, group) {
  if (!group) group = 'feature'
  if (!ee) ee = handleEE

  var groupHandlers = handlers[group] = handlers[group] || {}
  var list = groupHandlers[type] = groupHandlers[type] || []
  list.push([ee, handler])
}
