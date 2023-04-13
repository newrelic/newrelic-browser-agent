import { getConfigurationValue, getInfo, getRuntime, setInfo } from '../../common/config/config'
import { drain } from '../../common/drain/drain'
import { ee } from '../../common/event-emitter/contextual-ee'
import { registerHandler } from '../../common/event-emitter/register-handler'
import { isBrowserScope } from '../../common/util/global-scope'
import { SessionEntity } from '../../common/session/session-entity'

let ranOnce = 0
export function setupAgentSession (agentIdentifier) {
  if (ranOnce++) return

  console.log('setupAgentSession!', agentIdentifier)

  const agentRuntime = getRuntime(agentIdentifier)
  agentRuntime.session = getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled') == true
    ? new SessionEntity({ agentIdentifier, key: 'SESSION' })
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
