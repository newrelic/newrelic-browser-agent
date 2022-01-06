/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var ee = require('./contextual-ee').get('handle')
var globalEE = require('./contextual-ee').global.get('handle')

// Exported for register-handler to attach to.
module.exports = handle
module.exports.global = globalHandle
handle.ee = ee
handle.globalEE = globalEE

function handle (type, args, ctx, group) {
  ee.buffer([type], group)
  ee.emit(type, args, ctx)
}

function globalHandle(type, args, ctx, group) {
  globalEE.buffer([type], group)
  globalEE.emit(type, args, ctx)
}
