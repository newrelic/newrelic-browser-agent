import { getConfigurationValue } from '../../common/config/config'
import { ee } from '../../common/event-emitter/contextual-ee'
import { FEATURE_NAMES } from '../../loaders/features/features'
import { MODE } from '../../common/session/session-entity'
import { registerHandler } from '../../common/event-emitter/register-handler'

/**
 * Figure out if the Replay feature is running (what mode it's in).
 * IMPORTANT: Session tracking is assumed to be ON; if applicable, check init's privacy.cookies_enabled setting before using this fn!
 * CRITICAL: This fn must be called prior to ALL features aggregate draining. If not, it will never resolve.
 * @param {String} agentId
 * @returns Promise that resolves to one of the values in MODE enum
 */
export async function getSessionReplayMode (agentId, sharedAggregator) {
  // Should be enabled by configuration and using an agent build that includes it (via checking that the instrument class was initialized).
  if (getConfigurationValue(agentId, 'session_replay.enabled') && typeof newrelic.initializedAgents[agentId].features.session_replay === 'object') {
    const srEntitlement = await new Promise(resolve => registerHandler('rumresp-sr', on => resolve(on), FEATURE_NAMES.sessionReplay, ee.get(agentId)))
    if (srEntitlement === true) {
      return await sharedAggregator.sessionReplayInitialized // wait for replay to determine which mode it's after running its sampling logic
    }
  }
  return MODE.OFF // at any step of the way s.t. SR cannot be on by implication or is explicitly off
}
