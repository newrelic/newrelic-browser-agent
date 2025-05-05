/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { now } from '../../common/timing/now'
import { LOG_LEVELS } from '../../features/logging/constants'
import { bufferLog } from '../../features/logging/shared/utils'
import { LOG } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupLogAPI (agent) {
  setupAPI(LOG, (message, options) => log(message, options, agent), agent)
}

export function log (message, { customAttributes = {}, level = LOG_LEVELS.INFO } = {}, agentRef, targetEntityGuid, timestamp = now()) {
  bufferLog(agentRef.ee, message, customAttributes, level, false, targetEntityGuid, timestamp)
}
