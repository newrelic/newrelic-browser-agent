/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../constants/runtime'

const GLOBAL_EVENT_NAMESPACE = 'newrelic'

export function dispatchGlobalEvent (detail = {}) {
  try {
    globalScope.dispatchEvent(new CustomEvent(GLOBAL_EVENT_NAMESPACE, { detail }))
  } catch (err) {
    // something happened... dispatchEvent or CustomEvent might not be supported
    // decide what to do about it here
  }
}
