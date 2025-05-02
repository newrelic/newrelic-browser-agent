/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { MODE } from '../../common/session/constants'
import { now } from '../../common/timing/now'
import { SR_EVENT_EMITTER_TYPES } from '../../features/session_replay/constants'
import { FEATURE_NAMES } from '../features/features'
import { NOTICE_ERROR, replayRunning } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupNoticeErrorAPI (agent) {
  setupAPI(NOTICE_ERROR, (err, customAttributes) => noticeError(err, customAttributes, agent), agent)

  replayRunning[agent.agentIdentifier] ??= MODE.OFF

  agent.ee.on(SR_EVENT_EMITTER_TYPES.REPLAY_RUNNING, (isRunning) => {
    replayRunning[agent.agentIdentifier] = isRunning
  })
}

export function noticeError (err, customAttributes, agentRef, targetEntityGuid, timestamp = now()) {
  if (typeof err === 'string') err = new Error(err)
  handle('err', [err, timestamp, false, customAttributes, !!replayRunning[agentRef.agentIdentifier], undefined, targetEntityGuid], undefined, FEATURE_NAMES.jserrors, agentRef.ee)
}
