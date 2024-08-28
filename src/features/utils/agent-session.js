import { getInfo } from '../../common/config/info'
import { getConfiguration } from '../../common/config/init'
import { getRuntime } from '../../common/config/runtime'
import { drain } from '../../common/drain/drain'
import { ee } from '../../common/event-emitter/contextual-ee'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { SessionEntity } from '../../common/session/session-entity'
import { LocalStorage } from '../../common/storage/local-storage.js'
import { DEFAULT_KEY } from '../../common/session/constants'

let ranOnce = 0
export function setupAgentSession (agentIdentifier) {
  const agentRuntime = getRuntime(agentIdentifier)
  if (ranOnce++) return agentRuntime.session

  const sessionInit = getConfiguration(agentIdentifier).session

  agentRuntime.session = new SessionEntity({
    agentIdentifier,
    key: DEFAULT_KEY,
    storage: new LocalStorage(),
    expiresMs: sessionInit?.expiresMs,
    inactiveMs: sessionInit?.inactiveMs
  })

  // Retrieve & re-add all of the persisted setCustomAttribute|setUserId k-v from previous page load(s), if any was stored.
  const customSessionData = agentRuntime.session.state.custom
  const agentInfo = getInfo(agentIdentifier)
  if (customSessionData) {
    agentInfo.jsAttributes = { ...agentInfo.jsAttributes, ...customSessionData }
  }

  const sharedEE = ee.get(agentIdentifier)

  // any calls to newrelic.setCustomAttribute(<persisted>) will need to be added to:
  // local info.jsAttributes {}
  // the session's storage API
  registerHandler('api-setCustomAttribute', (time, key, value) => {
    agentRuntime.session.syncCustomAttribute(key, value)
  }, 'session', sharedEE)

  // any calls to newrelic.setUserId(...) will need to be added to:
  // local info.jsAttributes {}
  // the session's storage API
  registerHandler('api-setUserId', (time, key, value) => {
    agentRuntime.session.syncCustomAttribute(key, value)
  }, 'session', sharedEE)

  drain(agentIdentifier, 'session')

  return agentRuntime.session
}
