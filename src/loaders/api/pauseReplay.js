/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { FEATURE_NAMES } from '../features/features'
import { PAUSE_REPLAY } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupPauseReplayAPI (agent) {
  setupAPI(PAUSE_REPLAY, function () {
    handle(PAUSE_REPLAY, [], undefined, FEATURE_NAMES.sessionReplay, agent.ee)
  }, agent)
}
