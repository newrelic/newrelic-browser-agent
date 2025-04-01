/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { globalScope } from '../constants/runtime'

const GLOBAL_EVENT_NAMESPACE = 'newrelic'

/**
 * Dispatches a global event with the given detail object
 * - Deprecation Notice: The `loaded` property for detail object is deprecated and will be removed in a future release.
 * @param detail - event detail
 *  - agentIdentifier: string - agent instance identifier
 *  - loaded: boolean - indicates whether the agent has finished loading, deprecated since 1.286.0. Replaced by 'drained'
 *  - drained: boolean - indicates whether the agent has finished draining
 *  - type: string - event type (e.g. lifecycle, data)
 *  - name: string - event name (e.g. load, harvest, buffer, api, initialize)
 */
export function dispatchGlobalEvent (detail = {}) {
  try {
    globalScope.dispatchEvent(new CustomEvent(GLOBAL_EVENT_NAMESPACE, { detail }))
  } catch (err) {
    // something happened... dispatchEvent or CustomEvent might not be supported
    // decide what to do about it here
  }
}
