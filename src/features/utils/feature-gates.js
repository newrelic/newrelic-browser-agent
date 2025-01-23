/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getConfigurationValue } from '../../common/config/init'
import { isBrowserScope } from '../../common/constants/runtime'

/**
 * Checks if session can be tracked, affects session entity and dependent features
 * @param {string} agentId
 * @returns {boolean}
 */
export const canEnableSessionTracking = (agentId) => {
  return isBrowserScope && getConfigurationValue(agentId, 'privacy.cookies_enabled') === true
}
