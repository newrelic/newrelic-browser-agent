/**
 * Copyright 2020-2025 New Relic, Inc. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { warn } from '../../common/util/console'
import { SET_USER_ID } from './constants'
import { appendJsAttribute, setupAPI } from './sharedHandlers'

export function setupSetUserIdAPI (agent) {
  /**
    * Attach the 'enduser.id' attribute onto agent payloads. This may be used in NR queries to group all browser events by specific users.
    * @param {string} value - unique user identifier; a null user id suggests none should exist
    * @returns @see apiCall
    */
  setupAPI(SET_USER_ID, function (value) {
    if (!(typeof value === 'string' || value === null)) {
      warn(41, typeof value)
      return
    }
    return appendJsAttribute(agent, 'enduser.id', value, SET_USER_ID, true)
  }, agent)
}
