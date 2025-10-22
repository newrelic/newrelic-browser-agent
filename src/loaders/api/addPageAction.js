/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { now } from '../../common/timing/now'
import { FEATURE_NAMES } from '../features/features'
import { ADD_PAGE_ACTION, prefix } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupAddPageActionAPI (agent) {
  setupAPI(ADD_PAGE_ACTION, (name, attributes) => addPageAction(name, attributes, agent), agent)
}

export function addPageAction (name, attributes, agentRef, target, timestamp = now()) {
  handle(prefix + ADD_PAGE_ACTION, [timestamp, name, attributes, target], undefined, FEATURE_NAMES.genericEvents, agentRef.ee)
}
