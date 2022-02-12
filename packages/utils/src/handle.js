/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import eePkg, { global } from './contextual-ee'
var ee = eePkg.get('handle')
var globalEE = global.get('handle')

// Exported for register-handler to attach to.
export default handle
export { globalHandle as global }
handle.ee = ee
handle.globalEE = globalEE

export function handle (type, args, ctx, group) {
  ee.buffer([type], group)
  ee.emit(type, args, ctx)
}

function globalHandle(type, args, ctx, group) {
  globalEE.buffer([type], group)
  globalEE.emit(type, args, ctx)
}
