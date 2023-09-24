import { MODE } from '../../common/session/session-entity'
import { gosNREUM } from '../../common/window/nreum'
import { sharedChannel } from '../../common/constants/shared-channel'

/**
 * Figure out if the Replay feature is running (what mode it's in).
 * IMPORTANT: Session tracking is assumed to be ON; if applicable, check init's privacy.cookies_enabled setting before using this fn!
 * CRITICAL: This fn must be called prior to ALL features aggregate draining. If not, it will never resolve.
 * @param {String} agentId
 * @returns Promise that resolves to one of the values in MODE enum
 */
export async function getSessionReplayMode (agentId, init) {
  try {
    const newrelic = gosNREUM()
    // Should be enabled by configuration and using an agent build that includes it (via checking that the instrument class was initialized).
    if (init?.session_replay?.enabled && typeof newrelic.initializedAgents[agentId].features.session_replay === 'object') {
      const srInitialized = await newrelic.initializedAgents[agentId].features.session_replay.onAggregateImported
      if (srInitialized) return await sharedChannel.sessionReplayInitialized // wait for replay to determine which mode it's after running its sampling logic
    }
  } catch (e) { /* exception ==> off */ }
  return MODE.OFF // at any step of the way s.t. SR cannot be on by implication or is explicitly off
}
