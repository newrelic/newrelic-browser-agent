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
  setupAPI(RECORD_CUSTOM_EVENT, (eventType, attributes) => recordCustomEvent(eventType, attributes, agent), agent)
}

export function recordCustomEvent (eventType, attributes = {}, agentRef, target, timestamp = now()) {
  handle(prefix + RECORD_CUSTOM_EVENT, [timestamp, eventType, attributes, target], undefined, FEATURE_NAMES.genericEvents, agentRef.ee)
}
