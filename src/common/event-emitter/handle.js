/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ee as globalInstance } from './contextual-ee'
export var handleEE = globalInstance.get('handle')

export function handle (type, args, ctx, group, ee) {
  if (ee) {
    ee.buffer([type], group)
    ee.emit(type, args, ctx)
  } else {
    handleEE.buffer([type], group)
    handleEE.emit(type, args, ctx)
  }
}
