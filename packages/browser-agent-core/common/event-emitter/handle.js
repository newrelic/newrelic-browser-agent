/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee as eePkg, global } from './contextual-ee'
export var handleEE = eePkg.get('handle')
export var globalEE = global.get('handle')

// Exported for register-handler to attach to.
// export default handle
export { globalHandle as global }

export function handle(type, args, ctx, group, ee) {
  if (ee) {
    ee.buffer([type], group)
    ee.emit(type, args, ctx)
  } else {
    handleEE.buffer([type], group)
    handleEE.emit(type, args, ctx)
  }
}

function globalHandle(type, args, ctx, group) {
  globalEE.buffer([type], group)
  globalEE.emit(type, args, ctx)
}
