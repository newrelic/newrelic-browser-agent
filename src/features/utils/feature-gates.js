import { getConfigurationValue } from '../../common/config/config'
import { isBrowserScope } from '../../common/constants/runtime'

/**
 * Checks if session can be tracked, affects session entity and dependent features
 * @param {string} agentId
 * @returns {boolean}
 */
export const canEnableSessionTracking = (agentId) => {
  return isBrowserScope && getConfigurationValue(agentId, 'privacy.cookies_enabled') === true && typeof PerformanceNavigationTiming !== 'undefined'
}
