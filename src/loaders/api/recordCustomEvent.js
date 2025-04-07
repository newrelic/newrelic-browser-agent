/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { now } from '../../common/timing/now'
import { FEATURE_NAMES } from '../features/features'
import { prefix, RECORD_CUSTOM_EVENT } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupRecordCustomEventAPI (agent) {
  setupAPI(RECORD_CUSTOM_EVENT, function () {
    handle(prefix + RECORD_CUSTOM_EVENT, [now(), ...arguments], undefined, FEATURE_NAMES.genericEvents, agent.ee)
  }, agent)
}
