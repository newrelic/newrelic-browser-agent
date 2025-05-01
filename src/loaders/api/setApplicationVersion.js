/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from '../../common/util/console'
import { SET_APPLICATION_VERSION } from './constants'
import { setupAPI, appendJsAttribute } from './sharedHandlers'

export function setupSetApplicationVersionAPI (agent) {
  /**
   * Attach the 'applcation.version' attribute onto agent payloads. This may be used in NR queries to group all browser events by a specific customer-defined release.
   * @param {string|null} value - Application version -- if null, will "unset" the value
   * @returns @see apiCall
   */
  setupAPI(SET_APPLICATION_VERSION, function (value) {
    if (!(typeof value === 'string' || value === null)) {
      warn(42, typeof value)
      return
    }
    return appendJsAttribute(agent, 'application.version', value, SET_APPLICATION_VERSION, false)
  }, agent)
}
