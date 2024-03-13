import { getConfiguration, getInfo, getRuntime } from '../../common/config/config'
import { drain } from '../../common/drain/drain'
import { ee } from '../../common/event-emitter/contextual-ee'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { SessionEntity } from '../../common/session/session-entity'
import { LocalStorage } from '../../common/storage/local-storage.js'
import { FirstPartyCookies } from '../../common/storage/first-party-cookies'
import { DEFAULT_KEY } from '../../common/session/constants'

let ranOnce = 0
export function setupAgentSession (agentIdentifier) {
  const agentRuntime = getRuntime(agentIdentifier)
  if (ranOnce++) return agentRuntime.session

  const sessionInit = getConfiguration(agentIdentifier).session
  /* Domain is a string that can be specified by customer. The only way to keep the session object across subdomains is using first party cookies.
    This determines which storage wrapper the session manager will use to keep state. */
  const storageTypeInst = sessionInit?.domain
    ? new FirstPartyCookies(sessionInit.domain)
    : new LocalStorage()

  agentRuntime.session = new SessionEntity({
    agentIdentifier,
    key: DEFAULT_KEY,
    storage: storageTypeInst,
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
