/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { handle } from '../../common/event-emitter/handle'
import { now } from '../../common/timing/now'
import { FEATURE_NAMES } from '../features/features'
import { NOTICE_ERROR } from './constants'
import { setupAPI } from './sharedHandlers'

export function setupNoticeErrorAPI (agent) {
  setupAPI(NOTICE_ERROR, (err, customAttributes) => noticeError(err, customAttributes, agent), agent)
}

export function noticeError (err, customAttributes, agentRef, target, timestamp = now()) {
  if (typeof err === 'string') err = new Error(err)
  handle('err', [err, timestamp, false, customAttributes, agentRef.runtime.isRecording, undefined, target], undefined, FEATURE_NAMES.jserrors, agentRef.ee)
  handle('uaErr', [], undefined, FEATURE_NAMES.genericEvents, agentRef.ee)
}
