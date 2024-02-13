import { getConfigurationValue } from '../../../common/config/config'

export function hasDependentSettings (agentIdentifier) {
  return (
    getConfigurationValue(agentIdentifier, 'privacy.cookies_enabled') === true &&
    getConfigurationValue(agentIdentifier, 'session_trace.enabled') === true
  )
}
