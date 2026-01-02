/**
 * Copyright 2020-2026 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { isBrowserScope } from '../../common/constants/runtime'

/**
 * Checks if session can be tracked, affects session entity and dependent features
 * @param {string} agentId
 * @returns {boolean}
 */
export const canEnableSessionTracking = (agentInit) => {
  return isBrowserScope && agentInit?.privacy.cookies_enabled === true
}
