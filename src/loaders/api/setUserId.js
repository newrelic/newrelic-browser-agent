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
   *  @param {boolean} [resetSession=false] - when true, resets the current session (if any) when changing user id. Note: if setting user id for the first time, session will not be reset.
    * @returns @see apiCall
    */
  setupAPI(SET_USER_ID, function (value, resetSession = false) {
    if (!(typeof value === 'string' || value === null)) {
      warn(41, typeof value)
      return
    }

    const currUser = agent.info.jsAttributes['enduser.id']

    // only reset session if we are not setting the userid for the first time
    const shouldReset = resetSession && agent.runtime.session && currUser != null && currUser !== value
    if (shouldReset) {
      agent.runtime.session.reset()
    }
    appendJsAttribute(agent, 'enduser.id', value, SET_USER_ID, true)
  }, agent)
}
