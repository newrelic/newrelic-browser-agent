import { getConfigurationValue, originals } from '../../../common/config/config'
import { isBrowserScope } from '../../../common/constants/runtime'

export const enableSessionTracking = (agentId) => isBrowserScope && getConfigurationValue(agentId, 'privacy.cookies_enabled') === true

function hasReplayPrerequisite (agentId) {
  return originals.MO && // Session Replay cannot work without Mutation Observer
  enableSessionTracking && // requires session tracking to be running (hence "session" replay...)
  getConfigurationValue(agentId, 'session_trace.enabled') === true // Session Replay as of now is tightly coupled with Session Trace in the UI
}

export function isPreloadAllowed (agentId) {
  return getConfigurationValue(agentId, 'session_replay.preload') === true && hasReplayPrerequisite(agentId)
}

export function canImportReplayAgg (agentId, sessionMgr) {
  if (!hasReplayPrerequisite(agentId)) return false
  return !!sessionMgr?.isNew || !!sessionMgr?.state.sessionReplayMode // Session Replay should only try to run if already running from a previous page, or at the beginning of a session
}

export function buildNRMetaNode (timestamp, timeKeeper) {
  const correctedTimestamp = timeKeeper.correctAbsoluteTimestamp(timestamp)
  return {
    originalTimestamp: timestamp,
    correctedTimestamp,
    timestampDiff: timestamp - correctedTimestamp,
    timeKeeperOriginTime: timeKeeper.originTime,
    timeKeeperCorrectedOriginTime: timeKeeper.correctedOriginTime,
    timeKeeperDiff: Math.floor(timeKeeper.originTime - timeKeeper.correctedOriginTime)
  }
}
