import { drain } from '../../common/drain/drain'
import { ee } from '../../common/event-emitter/contextual-ee'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { SessionEntity } from '../../common/session/session-entity'
import { LocalStorage } from '../../common/storage/local-storage.js'
import { DEFAULT_KEY } from '../../common/session/constants'

export function setupAgentSession (agentRef) {
  if (agentRef.runtime.session) return agentRef.runtime.session // already setup

  const sessionInit = agentRef.init.session

  agentRef.runtime.session = new SessionEntity({
    agentIdentifier: agentRef.agentIdentifier,
    key: DEFAULT_KEY,
    storage: new LocalStorage(),
    expiresMs: sessionInit?.expiresMs,
    inactiveMs: sessionInit?.inactiveMs
  })

  // Retrieve & re-add all of the persisted setCustomAttribute|setUserId k-v from previous page load(s), if any was stored.
  const customSessionData = agentRef.runtime.session.state.custom
  if (customSessionData) {
    agentRef.info.jsAttributes = { ...agentRef.info.jsAttributes, ...customSessionData }
  }

  const sharedEE = ee.get(agentRef.agentIdentifier)

  // any calls to newrelic.setCustomAttribute(<persisted>) will need to be added to:
  // local info.jsAttributes {}
  // the session's storage API
  registerHandler('api-setCustomAttribute', (time, key, value) => {
    agentRef.runtime.session.syncCustomAttribute(key, value)
  }, 'session', sharedEE)

  // any calls to newrelic.setUserId(...) will need to be added to:
  // local info.jsAttributes {}
  // the session's storage API
  registerHandler('api-setUserId', (time, key, value) => {
    agentRef.runtime.session.syncCustomAttribute(key, value)
  }, 'session', sharedEE)

  drain(agentRef.agentIdentifier, 'session')

  return agentRef.runtime.session
}
