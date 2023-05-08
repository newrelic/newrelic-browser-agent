import { getConfigurationValue, getInfo, getRuntime, setInfo } from '../../common/config/config'
import { drain } from '../../common/drain/drain'
import { ee } from '../../common/event-emitter/contextual-ee'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { isBrowserScope } from '../../common/util/global-scope'
import { SessionEntity } from '../../common/session/session-entity'
import { LocalStorage } from '../../common/storage/local-storage.js'
import { FirstPartyCookies } from '../../common/storage/first-party-cookies'
import { LocalMemory } from '../../common/storage/local-memory'

let ranOnce = 0
export function setupAgentSession (agentIdentifier) {
  const agentRuntime = getRuntime(agentIdentifier)
  if (ranOnce++) return agentRuntime.session

  const sharedEE = ee.get(agentIdentifier)

  // domain is a string that can be specified by customer.
  // only way to keep the session object across subdomains is using first party cookies
  // This determines which storage wrapper the session manager will use to keep state
  let storageAPI
  const cookiesEnabled = getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled') === true
  if (cookiesEnabled && isBrowserScope) {
    storageAPI = getConfigurationValue(agentIdentifier, 'session.domain')
      ? new FirstPartyCookies(getConfigurationValue(agentIdentifier, 'session.domain'))
      : new LocalStorage()
  }

  console.log(getConfigurationValue(agentIdentifier, 'session.expiresMs'))
  console.log(getConfigurationValue(agentIdentifier, 'session.inactiveMs'))

  if (cookiesEnabled) {
    // defaults to "LocalMemory" if storageAPI is undefined, such as in Worker build
    agentRuntime.session = new SessionEntity({
      agentIdentifier,
      key: 'SESSION',
      storageAPI,
      expiresMs: getConfigurationValue(agentIdentifier, 'session.expiresMs'),
      inactiveMs: getConfigurationValue(agentIdentifier, 'session.inactiveMs')
    })
  }

  // The first time the agent runs on a page, it should put everything
  // that's currently stored in the storage API into the local info.jsAttributes object
  if (isBrowserScope) {
    // retrieve & re-add all of the persisted setCustomAttribute|setUserId k-v from previous page load(s)
    const customSessionData = agentRuntime.session?.read?.()?.custom
    const agentInfo = getInfo(agentIdentifier)
    if (customSessionData) {
      setInfo(agentIdentifier, { ...agentInfo, jsAttributes: { ...agentInfo.jsAttributes, ...customSessionData } })
    }
  }

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
