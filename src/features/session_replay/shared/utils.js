/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { gosNREUMOriginals } from '../../../common/window/nreum'
import { getConfigurationValue } from '../../../common/config/init'
import { canEnableSessionTracking } from '../../utils/feature-gates'
import { originTime } from '../../../common/constants/runtime'

export function hasReplayPrerequisite (agentId) {
  return !!gosNREUMOriginals().o.MO && // Session Replay cannot work without Mutation Observer
  canEnableSessionTracking(agentId) && // requires session tracking to be running (hence "session" replay...)
  getConfigurationValue(agentId, 'session_trace.enabled') === true // Session Replay as of now is tightly coupled with Session Trace in the UI
}

export function isPreloadAllowed (agentId) {
  return getConfigurationValue(agentId, 'session_replay.preload') === true && hasReplayPrerequisite(agentId)
}

export function buildNRMetaNode (timestamp, timeKeeper) {
  const correctedTimestamp = timeKeeper.correctAbsoluteTimestamp(timestamp)
  return {
    originalTimestamp: timestamp,
    correctedTimestamp,
    timestampDiff: timestamp - correctedTimestamp,
    originTime,
    correctedOriginTime: timeKeeper.correctedOriginTime,
    originTimeDiff: Math.floor(originTime - timeKeeper.correctedOriginTime)
  }
}
