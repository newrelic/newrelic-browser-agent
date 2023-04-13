import { getConfigurationValue, getInfo, getRuntime, setInfo } from '../../common/config/config'
import { drain } from '../../common/drain/drain'
import { ee } from '../../common/event-emitter/contextual-ee'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { isBrowserScope } from '../../common/util/global-scope'
import { SessionEntity } from '../../common/session/session-entity'
import { LocalStorage } from '../../common/storage/local-storage.js'
import { FirstPartyCookies } from '../../common/storage/first-party-cookies'

let ranOnce = 0
export function setupAgentSession (agentIdentifier) {
  if (ranOnce++) return

  const agentRuntime = getRuntime(agentIdentifier)
  // subdomains is a boolean that can be specified by customer.
  // only way to keep the session object across subdomains is using first party cookies
  // This determines which storage wrapper the session manager will use to keep state
  const storageAPI = getConfigurationValue(agentIdentifier, 'session.subdomains')
    ? new FirstPartyCookies(getConfigurationValue(agentIdentifier, 'session.domain'))
    : new LocalStorage()

  agentRuntime.session = getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled') == true
    ? new SessionEntity({ agentIdentifier, key: 'SESSION', storageAPI })
    : null
  // if cookies (now session tracking) is turned off or can't get session ID, this is null

  // The first time the agent runs on a page, it should put everything
  // that's currently stored in the storage API into the local info.jsAttributes object
  if (isBrowserScope) {
    // retrieve & re-add all of the persisted setCustomAttribute|setUserId k-v from previous page load(s)
    const customSessionData = agentRuntime.session.read()?.custom
    console.log('customSessionData', customSessionData)
    if (customSessionData) {
      const agentInfo = getInfo(agentIdentifier)
      setInfo(agentIdentifier, { ...agentInfo, jsAttributes: { ...agentInfo.jsAttributes, ...customSessionData } })
    }
  }

  // any calls to newrelic.setCustomAttribute(<persisted>) will need to be added to:
  // local info.jsAttributes {}
  // the session's storage API
  registerHandler('api-setCustomAttribute', (time, key, value) => {
    agentRuntime.session.syncCustomAttribute(key, value)
  }, 'session', ee.get(agentIdentifier))

  // any calls to newrelic.setUserId(...) will need to be added to:
  // local info.jsAttributes {}
  // the session's storage API
  registerHandler('api-setUserId', (time, key, value) => {
    agentRuntime.session.syncCustomAttribute(key, value)
  }, 'session', ee.get(agentIdentifier))

  drain(agentIdentifier, 'session')
}
