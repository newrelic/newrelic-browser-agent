/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../constants/runtime'
import { gosNREUMOriginals } from '../window/nreum'

export function extractUrl (target) {
  if (typeof target === 'string') {
    return target
  } else if (typeof target === 'object' && target instanceof gosNREUMOriginals().o.REQ) {
    return target.url
  } else if (globalScope?.URL && typeof target === 'object' && target instanceof URL) {
    return target.href
  }
  return undefined
}
