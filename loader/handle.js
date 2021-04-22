/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var ee = require('ee').get('handle')

// Exported for register-handler to attach to.
module.exports = handle
handle.ee = ee

function handle (type, args, ctx, group) {
  ee.buffer([type], group)
  ee.emit(type, args, ctx)
}
