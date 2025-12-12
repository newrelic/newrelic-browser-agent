/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { wrapLogger } from '../../common/wrap/wrap-logger'
import { LOG_LEVELS } from '../../features/logging/constants'
import { WRAP_LOGGER } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupWrapLoggerAPI (agent) {
  setupAPI(WRAP_LOGGER, (parent, functionName, { customAttributes = {}, level = LOG_LEVELS.INFO } = {}) => {
    wrapLogger(agent.ee, parent, functionName, { customAttributes, level }, false)
  }, agent)
}
