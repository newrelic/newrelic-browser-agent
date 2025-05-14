/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { SET_ERROR_HANDLER } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupSetErrorHandlerAPI (agent) {
  setupAPI(SET_ERROR_HANDLER, function (callback) {
    agent.runtime.onerror = callback
  }, agent)
}
