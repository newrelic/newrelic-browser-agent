/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../features/features'
import { RECORD_REPLAY } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupRecordReplayAPI (agent) {
  setupAPI(RECORD_REPLAY, function () {
    handle(RECORD_REPLAY, [], undefined, FEATURE_NAMES.sessionReplay, agent.ee)
  }, agent)
}
