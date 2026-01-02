/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../constants/runtime'

export function isFileProtocol () {
  return Boolean(globalScope?.location?.protocol === 'file:')
}
